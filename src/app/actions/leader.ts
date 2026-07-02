"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { UserRole } from "@/lib/database.types";

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

export async function addTemplateTask(milestoneId: string, name: string) {
  await requireRole("team_leader");
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
  revalidatePath("/leader/template");
}

export async function renameTemplateTask(id: string, name: string) {
  await requireRole("team_leader");
  const supabase = createClient();
  const { error } = await supabase
    .from("task_templates")
    .update({ name: name.trim() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/leader/template");
}

export async function deleteTemplateTask(id: string) {
  await requireRole("team_leader");
  const supabase = createClient();
  const { error } = await supabase.from("task_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/leader/template");
}

export async function updateMilestone(input: {
  id: string;
  name: string;
  description: string;
}) {
  await requireRole("team_leader");
  const supabase = createClient();
  const { error } = await supabase
    .from("milestones")
    .update({ name: input.name.trim(), description: input.description })
    .eq("id", input.id);
  if (error) throw new Error(error.message);
  revalidatePath("/leader/template");
}
