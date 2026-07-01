import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { LeaderNav } from "@/components/LeaderNav";
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
    <>
      <TopBar name={user.full_name} role={user.role} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Program template
        </h1>
        <LeaderNav />
        <TemplateEditor
          milestones={(milestones as MilestoneRow[]) ?? []}
          templates={(templates as TaskTemplateRow[]) ?? []}
        />
      </main>
    </>
  );
}
