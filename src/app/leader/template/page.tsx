import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { TemplateEditor } from "@/components/TemplateEditor";
import type { MilestoneRow, TaskTemplateRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function TemplatePage() {
  const user = await requireRole("team_leader");
  const supabase = createClient();

  const [{ data: milestones }, { data: templates }] = await Promise.all([
    supabase.from("milestones").select("*").order("sequence"),
    supabase.from("task_templates").select("*").order("sequence"),
  ]);

  return (
    <AppShell name={user.full_name} email={user.email} role={user.role}>
      <div className="ios-page">
        <h1 className="ios-h1">Program template</h1>
        <p className="ios-subtitle">
          The shared milestones and default tasks every intern receives.
        </p>
        <div className="mt-8">
          <TemplateEditor
            milestones={(milestones as MilestoneRow[]) ?? []}
            templates={(templates as TaskTemplateRow[]) ?? []}
          />
        </div>
      </div>
    </AppShell>
  );
}
