import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { DesignerTaskList } from "@/components/DesignerTaskList";
import { OverallFeedbackPanel } from "@/components/OverallFeedbackPanel";
import { InternTabs } from "@/components/InternTabs";
import type { FeedbackEntryView } from "@/components/FeedbackHistory";
import { ProgressBar } from "@/components/ProgressBar";
import { Avatar } from "@/components/ui";
import {
  formatDate,
  summarizeHours,
  projectEndDate,
} from "@/lib/progress";
import type {
  FeedbackCategoryRow,
  FeedbackEntryRow,
  FeedbackRatingRow,
  HoursLogRow,
  InternRow,
  MilestoneRow,
  TaskRow,
  TaskLinkRow,
  TaskAttachmentRow,
  TaskTemplateLinkRow,
  UserRow,
} from "@/lib/database.types";

export type TaskLink = { name: string; url: string };
export type TaskLinkItem = { id: string; name: string; url: string };
export type AttachmentItem = {
  id: string;
  kind: "file" | "link";
  name: string;
  href: string;
  mime: string | null;
};

// Full per-intern view, used by the designer and the team leader.
export async function InternDetail({
  internId,
  backHref,
  backLabelKey,
}: {
  internId: string;
  backHref: string;
  backLabelKey: "backToInterns" | "backToOverview";
}) {
  const supabase = createClient();
  const t = await getTranslations("intern");
  const locale = await getLocale();

  const { data: intern } = await supabase
    .from("interns")
    .select("*")
    .eq("id", internId)
    .single<InternRow>();

  if (!intern) {
    const tc = await getTranslations("common");
    return (
      <div
        className="ios-card"
        style={{ padding: "24px 28px", fontSize: 15, color: "var(--label-secondary)" }}
      >
        {tc("notFound")}
      </div>
    );
  }

  const [
    { data: person },
    { data: milestones },
    { data: tasks },
    { data: logs },
    { data: categories },
    { data: entries },
    { data: links },
  ] = await Promise.all([
    supabase.from("users").select("*").eq("id", intern.user_id).single<UserRow>(),
    // Global phases (intern_id null) + phases scoped to this intern.
    supabase
      .from("milestones")
      .select("*")
      .or(`intern_id.is.null,intern_id.eq.${internId}`)
      .order("sequence"),
    supabase.from("tasks").select("*").eq("intern_id", internId),
    supabase
      .from("hours_logs")
      .select("*")
      .eq("intern_id", internId)
      .order("date", { ascending: false }),
    supabase
      .from("feedback_categories")
      .select("*")
      .eq("active", true)
      .order("sequence"),
    supabase
      .from("feedback_entries")
      .select("*")
      .eq("intern_id", internId)
      .order("created_at", { ascending: false }),
    supabase.from("task_template_links").select("*").order("sequence"),
  ]);

  // Template-task links, keyed by template_id. Intern tasks copied from a
  // template carry that template's id (tasks.template_id), so links match
  // directly by id — no task_templates read, immune to template renames.
  const linksByTemplateId: Record<string, TaskLink[]> = {};
  for (const l of (links as TaskTemplateLinkRow[]) ?? []) {
    (linksByTemplateId[l.template_id] ??= []).push({
      name: l.name,
      url: l.url,
    });
  }

  const entryRows = (entries as FeedbackEntryRow[]) ?? [];
  let ratings: FeedbackRatingRow[] = [];
  if (entryRows.length > 0) {
    const { data: r } = await supabase
      .from("feedback_ratings")
      .select("*")
      .in(
        "entry_id",
        entryRows.map((e) => e.id)
      );
    ratings = (r as FeedbackRatingRow[]) ?? [];
  }

  const ratingsByEntry = new Map<string, FeedbackRatingRow[]>();
  for (const r of ratings) {
    const list = ratingsByEntry.get(r.entry_id) ?? [];
    list.push(r);
    ratingsByEntry.set(r.entry_id, list);
  }
  const entryViews: FeedbackEntryView[] = entryRows.map((e) => ({
    ...e,
    ratings: ratingsByEntry.get(e.id) ?? [],
  }));

  const taskRows = (tasks as TaskRow[]) ?? [];

  // Per-task resource links (custom + template tasks), keyed by task id.
  let taskLinks: TaskLinkRow[] = [];
  if (taskRows.length > 0) {
    const { data: tl } = await supabase
      .from("task_links")
      .select("*")
      .in(
        "task_id",
        taskRows.map((t) => t.id)
      )
      .order("sequence");
    taskLinks = (tl as TaskLinkRow[]) ?? [];
  }
  const taskLinksByTaskId: Record<string, TaskLinkItem[]> = {};
  for (const l of taskLinks) {
    (taskLinksByTaskId[l.task_id] ??= []).push({
      id: l.id,
      name: l.name,
      url: l.url,
    });
  }

  const attachmentsByTaskId: Record<string, AttachmentItem[]> = {};
  {
    const { data: rows } = await supabase
      .from("task_attachments")
      .select("*")
      .eq("intern_id", internId)
      .order("created_at");
    const atts = (rows as TaskAttachmentRow[]) ?? [];

    const filePaths = atts
      .filter((a) => a.kind === "file" && a.storage_path)
      .map((a) => a.storage_path as string);
    const signed: Record<string, string> = {};
    if (filePaths.length > 0) {
      const { data: urls } = await supabase.storage
        .from("task-attachments")
        .createSignedUrls(filePaths, 60 * 60);
      for (const u of urls ?? []) {
        if (u.path && u.signedUrl) signed[u.path] = u.signedUrl;
      }
    }

    for (const a of atts) {
      const href =
        a.kind === "file" ? signed[a.storage_path ?? ""] ?? "" : a.url ?? "";
      if (!href) continue;
      (attachmentsByTaskId[a.task_id] ??= []).push({
        id: a.id,
        kind: a.kind,
        name: a.name,
        href,
        mime: a.mime_type,
      });
    }
  }

  const name = person?.full_name ?? person?.email ?? "Intern";
  const hours = summarizeHours((logs as HoursLogRow[]) ?? [], intern.target_hours);
  const projected = projectEndDate(hours.remaining);
  const categoryRows = (categories as FeedbackCategoryRow[]) ?? [];

  return (
    <div>
      <Link
        href={backHref}
        className="mb-[14px] inline-flex items-center gap-[6px]"
        style={{ fontSize: 15, color: "var(--tint)" }}
      >
        <svg width="8" height="14" viewBox="0 0 8 14" style={{ transform: "scaleX(var(--dir-flip, 1))" }}>
          <path
            d="M 7 1 L 1 7 L 7 13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{t(backLabelKey)}</span>
      </Link>

      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={name} email={person?.email} size={56} neutral />
          <div>
            <h1 className="ios-h1">{name}</h1>
            <p className="ios-subtitle" style={{ marginTop: 2 }}>
              {person?.email} · {formatDate(intern.start_date, locale)} –{" "}
              {formatDate(intern.end_date, locale)}
            </p>
          </div>
        </div>
      </div>

      <div className="ios-card mt-7" style={{ padding: "20px 24px" }}>
        <div className="flex items-baseline justify-between">
          <div style={{ fontSize: 15, fontWeight: 590 }}>{t("hoursTowardTarget")}</div>
          <div style={{ fontSize: 15, color: "var(--label-secondary)" }}>
            {t("hoursOf", { worked: hours.worked, target: hours.target })}
            {hours.remaining > 0
              ? t("projectedEnd", { date: formatDate(projected, locale) })
              : t("complete")}
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar percent={hours.percent} />
        </div>
      </div>

      <div className="mt-8">
        <InternTabs
          tasksSlot={
            <DesignerTaskList
              internId={internId}
              milestones={(milestones as MilestoneRow[]) ?? []}
              tasks={taskRows}
              linksByTemplateId={linksByTemplateId}
              taskLinksByTaskId={taskLinksByTaskId}
              attachmentsByTaskId={attachmentsByTaskId}
            />
          }
          feedbackSlot={
            <OverallFeedbackPanel
              internId={internId}
              categories={categoryRows}
              entries={entryViews}
            />
          }
        />
      </div>
    </div>
  );
}
