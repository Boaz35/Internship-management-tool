import { getTranslations } from "next-intl/server";
import { requireAnyRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { TemplateEditor, type InternOption } from "@/components/TemplateEditor";
import type {
  InternRow,
  MilestoneRow,
  TaskTemplateLinkRow,
  TaskTemplateRow,
  UserRow,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function TemplatePage() {
  const user = await requireAnyRole(["team_leader", "designer"]);
  const t = await getTranslations("template");
  const supabase = createClient();

  const [{ data: milestones }, { data: templates }, { data: links }, { data: interns }] =
    await Promise.all([
      supabase.from("milestones").select("*").order("sequence"),
      supabase.from("task_templates").select("*").order("sequence"),
      supabase.from("task_template_links").select("*").order("sequence"),
      supabase.from("interns").select("id, user_id"),
    ]);

  // Resolve intern display names for the phase-assignment picker.
  const internRows = (interns as Pick<InternRow, "id" | "user_id">[]) ?? [];
  let internOptions: InternOption[] = [];
  if (internRows.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, email")
      .in(
        "id",
        internRows.map((i) => i.user_id)
      );
    const byId = new Map(
      ((users as Pick<UserRow, "id" | "full_name" | "email">[]) ?? []).map((u) => [
        u.id,
        u.full_name ?? u.email,
      ])
    );
    internOptions = internRows
      .map((i) => ({ id: i.id, name: byId.get(i.user_id) ?? "Intern" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <AppShell name={user.full_name} email={user.email} role={user.role}>
      <div className="ios-page">
        <h1 className="ios-h1">{t("title")}</h1>
        <p className="ios-subtitle">{t("subtitle")}</p>
        <div className="mt-8">
          <TemplateEditor
            milestones={(milestones as MilestoneRow[]) ?? []}
            templates={(templates as TaskTemplateRow[]) ?? []}
            links={(links as TaskTemplateLinkRow[]) ?? []}
            interns={internOptions}
          />
        </div>
      </div>
    </AppShell>
  );
}
