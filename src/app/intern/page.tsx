import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { HoursOverview } from "@/components/HoursOverview";
import { HoursLogger } from "@/components/HoursLogger";
import { InternTaskList } from "@/components/InternTaskList";
import { SectionLabel } from "@/components/ui";
import type {
  HoursLogRow,
  InternRow,
  MilestoneRow,
  TaskRow,
  TaskLinkRow,
  TaskAttachmentRow,
  TaskTemplateLinkRow,
} from "@/lib/database.types";

export type TaskLink = { name: string; url: string };
export type AttachmentItem = {
  id: string;
  kind: "file" | "link";
  name: string;
  href: string;
  mime: string | null;
};

export const dynamic = "force-dynamic";

export default async function InternDashboard() {
  const user = await requireRole("intern");
  const t = await getTranslations("internDash");
  const supabase = createClient();

  const { data: intern } = await supabase
    .from("interns")
    .select("*")
    .eq("user_id", user.id)
    .single<InternRow>();

  if (!intern) {
    return (
      <AppShell name={user.full_name} email={user.email} role={user.role}>
        <div className="ios-page">
          <div
            className="ios-card"
            style={{ padding: "24px 28px", fontSize: 15, color: "var(--label-secondary)" }}
          >
            {t("notSetUp")}
          </div>
        </div>
      </AppShell>
    );
  }

  const [
    { data: milestones },
    { data: tasks },
    { data: logs },
    { data: links },
  ] = await Promise.all([
    // Global phases (intern_id null) + phases scoped to this intern.
    supabase
      .from("milestones")
      .select("*")
      .or(`intern_id.is.null,intern_id.eq.${intern.id}`)
      .order("sequence"),
    supabase.from("tasks").select("*").eq("intern_id", intern.id),
    supabase
      .from("hours_logs")
      .select("*")
      .eq("intern_id", intern.id)
      .order("date", { ascending: false }),
    supabase.from("task_template_links").select("*").order("sequence"),
  ]);

  // Template-task links, keyed by template_id. Each intern task copied from a
  // template carries that template's id (tasks.template_id), so we match links
  // directly by id — no need to read task_templates (which interns can't), and
  // immune to template renames.
  const linksByTemplateId: Record<string, TaskLink[]> = {};
  for (const l of (links as TaskTemplateLinkRow[]) ?? []) {
    (linksByTemplateId[l.template_id] ??= []).push({ name: l.name, url: l.url });
  }

  // Per-task links attached directly to this intern's tasks (incl. custom tasks).
  const taskRows = (tasks as TaskRow[]) ?? [];
  const taskLinksByTaskId: Record<string, TaskLink[]> = {};
  if (taskRows.length > 0) {
    const { data: tl } = await supabase
      .from("task_links")
      .select("*")
      .in(
        "task_id",
        taskRows.map((t) => t.id)
      )
      .order("sequence");
    for (const l of (tl as TaskLinkRow[]) ?? []) {
      (taskLinksByTaskId[l.task_id] ??= []).push({ name: l.name, url: l.url });
    }
  }

  // Intern-owned attachments (files + links). Files are in a private bucket, so
  // we mint short-lived signed URLs for the ones on screen.
  const attachmentsByTaskId: Record<string, AttachmentItem[]> = {};
  {
    const { data: rows } = await supabase
      .from("task_attachments")
      .select("*")
      .eq("intern_id", intern.id)
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

  const firstName = user.full_name ? user.full_name.split(" ")[0] : null;

  return (
    <AppShell name={user.full_name} email={user.email} role={user.role}>
      <div className="ios-page">
        <h1 className="ios-h1">
          {firstName ? t("welcomeName", { name: firstName }) : t("welcome")}
        </h1>
        <p className="ios-subtitle">{t("subtitle")}</p>

        <div className="mt-8">
          <HoursOverview
            logs={(logs as HoursLogRow[]) ?? []}
            target={intern.target_hours}
          />
        </div>

        <div className="mt-8 grid items-start gap-7 lg:grid-cols-2">
          <div>
            <SectionLabel>{t("yourProgram")}</SectionLabel>
            <InternTaskList
              milestones={(milestones as MilestoneRow[]) ?? []}
              tasks={taskRows}
              linksByTemplateId={linksByTemplateId}
              taskLinksByTaskId={taskLinksByTaskId}
              attachmentsByTaskId={attachmentsByTaskId}
            />
          </div>
          <div>
            <SectionLabel>{t("hours")}</SectionLabel>
            <HoursLogger logs={(logs as HoursLogRow[]) ?? []} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
