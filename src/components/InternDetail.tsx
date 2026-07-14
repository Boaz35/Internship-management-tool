import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { DesignerTaskList } from "@/components/DesignerTaskList";
import { OverallFeedbackPanel } from "@/components/OverallFeedbackPanel";
import type { FeedbackEntryView } from "@/components/FeedbackHistory";
import { ProgressBar } from "@/components/ProgressBar";
import { Avatar, SectionLabel } from "@/components/ui";
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
  UserRow,
} from "@/lib/database.types";

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
  ] = await Promise.all([
    supabase.from("users").select("*").eq("id", intern.user_id).single<UserRow>(),
    supabase.from("milestones").select("*").order("sequence"),
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
  ]);

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

  const feedbackCountByTask: Record<string, number> = {};
  for (const e of entryRows) {
    if (e.task_id) feedbackCountByTask[e.task_id] = (feedbackCountByTask[e.task_id] ?? 0) + 1;
  }

  const taskRows = (tasks as TaskRow[]) ?? [];
  const taskNames: Record<string, string> = {};
  for (const tk of taskRows) taskNames[tk.id] = tk.name;

  const name = person?.full_name ?? person?.email ?? "Intern";
  const hours = summarizeHours((logs as HoursLogRow[]) ?? [], intern.target_hours);
  const projected = projectEndDate(hours.remaining);

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
        <Link
          href={`/summary/${internId}`}
          className="inline-flex flex-shrink-0 items-center gap-[7px]"
          style={{
            height: 40,
            padding: "0 18px",
            borderRadius: 100,
            background: "var(--fill-tertiary)",
            color: "#000",
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          <span>{t("summaryDocument")}</span>
          <svg width="7" height="12" viewBox="0 0 7 12" style={{ transform: "scaleX(var(--dir-flip, 1))" }}>
            <path
              d="M 1 1 L 6 6 L 1 11"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
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

      <div
        className="mt-8 grid items-start gap-7"
        style={{ gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)" }}
      >
        <div>
          <SectionLabel>{t("tasks")}</SectionLabel>
          <DesignerTaskList
            internId={internId}
            milestones={(milestones as MilestoneRow[]) ?? []}
            tasks={taskRows}
            categories={(categories as FeedbackCategoryRow[]) ?? []}
            feedbackCountByTask={feedbackCountByTask}
          />
        </div>
        <OverallFeedbackPanel
          internId={internId}
          categories={(categories as FeedbackCategoryRow[]) ?? []}
          entries={entryViews}
          taskNames={taskNames}
        />
      </div>
    </div>
  );
}
