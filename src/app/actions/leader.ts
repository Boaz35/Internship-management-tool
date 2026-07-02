"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole, requireAnyRole } from "@/lib/auth";
import type { UserRole } from "@/lib/database.types";

// Team leaders and mentors can both edit the shared program template.
const TEMPLATE_EDITORS: UserRole[] = ["team_leader", "designer"];

// --- People -----------------------------------------------------------------

export async function setUserRole(userId: string, role: UserRole) {
  await requireRole("team_leader");
  const supabase = createClient();
  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/leader");
  revalidatePath("/leader/allocation");
}

// Create an intern record for a user and instantiate their task list from the
// current template.
export async function createIntern(input: {
  userId: string;
  startDate: string;
  endDate?: string | null;
  targetHours?: number;
  designerId?: string | null;
}) {
  await requireRole("team_leader");
  const supabase = createClient();

  // Make sure the user's role is 'intern'.
  await supabase.from("users").update({ role: "intern" }).eq("id", input.userId);

  const { data: intern, error } = await supabase
    .from("interns")
    .insert({
      user_id: input.userId,
      start_date: input.startDate,
      end_date: input.endDate ?? null,
      target_hours: input.targetHours ?? 180,
      allocated_designer_id: input.designerId ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await instantiateTemplateTasks(intern!.id);

  revalidatePath("/leader");
  revalidatePath("/leader/allocation");
  return intern!.id;
}

export async function updateInternDates(input: {
  internId: string;
  startDate: string;
  endDate?: string | null;
  targetHours?: number;
}) {
  await requireRole("team_leader");
  const supabase = createClient();
  const { error } = await supabase
    .from("interns")
    .update({
      start_date: input.startDate,
      end_date: input.endDate ?? null,
      ...(input.targetHours ? { target_hours: input.targetHours } : {}),
    })
    .eq("id", input.internId);
  if (error) throw new Error(error.message);
  revalidatePath("/leader");
  revalidatePath(`/leader/intern/${input.internId}`);
}

export async function allocateIntern(internId: string, designerId: string | null) {
  await requireRole("team_leader");
  const supabase = createClient();
  const { error } = await supabase
    .from("interns")
    .update({ allocated_designer_id: designerId })
    .eq("id", internId);
  if (error) throw new Error(error.message);
  revalidatePath("/leader/allocation");
  revalidatePath("/leader");
  revalidatePath("/designer");
}

// Copy every current task_template row into this intern's tasks.
async function instantiateTemplateTasks(internId: string) {
  const supabase = createClient();
  const { data: templates } = await supabase
    .from("task_templates")
    .select("milestone_id, name");
  if (!templates || templates.length === 0) return;

  const rows = templates.map((t) => ({
    intern_id: internId,
    milestone_id: t.milestone_id,
    name: t.name,
    source: "template" as const,
  }));
  await supabase.from("tasks").insert(rows);
}

// --- Template editor --------------------------------------------------------

// Revalidate every route that renders template-derived data.
function revalidateTemplate() {
  revalidatePath("/template");
  revalidatePath("/leader/template");
  revalidatePath("/intern");
  revalidatePath("/designer");
  revalidatePath("/leader");
}

// Add a task to the template AND fan it out to every current intern, so a new
// task shows up immediately for the whole cohort (not just future interns).
export async function addTemplateTask(milestoneId: string, name: string) {
  await requireAnyRole(TEMPLATE_EDITORS);
  if (!name.trim()) return;
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("task_templates")
    .select("sequence")
    .eq("milestone_id", milestoneId)
    .order("sequence", { ascending: false })
    .limit(1);
  const nextSeq = (existing?.[0]?.sequence ?? 0) + 1;

  const { error } = await supabase
    .from("task_templates")
    .insert({ milestone_id: milestoneId, name: name.trim(), sequence: nextSeq });
  if (error) throw new Error(error.message);

  // Propagate to existing interns.
  const { data: interns } = await supabase.from("interns").select("id");
  if (interns && interns.length > 0) {
    const rows = interns.map((i: { id: string }) => ({
      intern_id: i.id,
      milestone_id: milestoneId,
      name: name.trim(),
      source: "template" as const,
    }));
    const { error: taskErr } = await supabase.from("tasks").insert(rows);
    if (taskErr) throw new Error(taskErr.message);
  }

  revalidateTemplate();
}

export async function renameTemplateTask(id: string, name: string) {
  await requireAnyRole(TEMPLATE_EDITORS);
  const supabase = createClient();
  const { error } = await supabase
    .from("task_templates")
    .update({ name: name.trim() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateTemplate();
}

// Removes only the template row — current interns keep the task they already have.
export async function deleteTemplateTask(id: string) {
  await requireAnyRole(TEMPLATE_EDITORS);
  const supabase = createClient();
  const { error } = await supabase.from("task_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateTemplate();
}

export async function updateMilestone(input: {
  id: string;
  name: string;
  description: string;
}) {
  await requireAnyRole(TEMPLATE_EDITORS);
  const supabase = createClient();
  const { error } = await supabase
    .from("milestones")
    .update({ name: input.name.trim(), description: input.description })
    .eq("id", input.id);
  if (error) throw new Error(error.message);
  revalidateTemplate();
}

// Add a new phase (milestone) to the program, appended after the last one.
export async function addMilestone(input: {
  name: string;
  description?: string;
}) {
  await requireAnyRole(TEMPLATE_EDITORS);
  if (!input.name.trim()) return;
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("milestones")
    .select("sequence")
    .order("sequence", { ascending: false })
    .limit(1);
  const nextSeq = (existing?.[0]?.sequence ?? 0) + 1;

  const { error } = await supabase.from("milestones").insert({
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    sequence: nextSeq,
  });
  if (error) throw new Error(error.message);
  revalidateTemplate();
}

// Delete a whole phase. Cascades to its template tasks and to every intern's
// tasks in that phase (destructive — the UI confirms first).
export async function deleteMilestone(id: string) {
  await requireAnyRole(TEMPLATE_EDITORS);
  const supabase = createClient();
  const { error } = await supabase.from("milestones").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateTemplate();
}
