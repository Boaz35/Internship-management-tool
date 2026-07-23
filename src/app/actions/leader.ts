"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole, requireAnyRole } from "@/lib/auth";
import { notify } from "@/lib/notify";
import type { UserRole } from "@/lib/database.types";

// Map a set of intern records to their users' ids, for notifying them.
async function internUserIds(internIds: string[]): Promise<string[]> {
  if (internIds.length === 0) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("interns")
    .select("user_id")
    .in("id", internIds);
  return (data ?? []).map((i: { user_id: string }) => i.user_id);
}

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
  // No revalidate — the UI updates optimistically; next navigation refetches.
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
  // No revalidate — the select updates optimistically; next navigation refetches.
}

// Copy every current task_template row into this intern's tasks.
async function instantiateTemplateTasks(internId: string) {
  const supabase = createClient();
  const { data: templates } = await supabase
    .from("task_templates")
    .select("id, milestone_id, name");
  if (!templates || templates.length === 0) return;

  const rows = templates.map((t) => ({
    intern_id: internId,
    milestone_id: t.milestone_id,
    name: t.name,
    source: "template" as const,
    template_id: t.id,
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
  const user = await requireAnyRole(TEMPLATE_EDITORS);
  if (!name.trim()) return;
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("task_templates")
    .select("sequence")
    .eq("milestone_id", milestoneId)
    .order("sequence", { ascending: false })
    .limit(1);
  const nextSeq = (existing?.[0]?.sequence ?? 0) + 1;

  const { data: tpl, error } = await supabase
    .from("task_templates")
    .insert({ milestone_id: milestoneId, name: name.trim(), sequence: nextSeq })
    .select("id")
    .single();
  if (error || !tpl) throw new Error(error?.message ?? "Could not add task.");

  // Propagate to existing interns, linked back to the new template task.
  const { data: interns } = await supabase.from("interns").select("id, user_id");
  if (interns && interns.length > 0) {
    const rows = interns.map((i: { id: string }) => ({
      intern_id: i.id,
      milestone_id: milestoneId,
      name: name.trim(),
      source: "template" as const,
      template_id: tpl.id,
    }));
    const { error: taskErr } = await supabase.from("tasks").insert(rows);
    if (taskErr) throw new Error(taskErr.message);

    // Notify every existing intern that a new task joined their program.
    await notify(
      (interns as { user_id: string }[]).map((i) => ({
        userId: i.user_id,
        type: "task_added" as const,
        actorId: user.id,
        actorName: user.full_name ?? user.email,
        data: { taskName: name.trim() },
        href: "/intern",
      }))
    );
  }

  revalidateTemplate();
}

// Rename a template task AND propagate the new name to every current intern's
// matching copy (template-sourced task in the same phase with the old name), so
// the change shows up across the whole cohort — not just future interns.
export async function renameTemplateTask(id: string, name: string) {
  await requireAnyRole(TEMPLATE_EDITORS);
  const newName = name.trim();
  if (!newName) return;
  const supabase = createClient();

  // Grab the old name first so we can find the intern copies to update.
  const { data: tpl } = await supabase
    .from("task_templates")
    .select("milestone_id, name")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("task_templates")
    .update({ name: newName })
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (tpl && tpl.name !== newName) {
    // Primary: every copy linked to this template task.
    const { error: linkedErr } = await supabase
      .from("tasks")
      .update({ name: newName })
      .eq("template_id", id);
    if (linkedErr) throw new Error(linkedErr.message);

    // Fallback: legacy copies not yet linked, matched by phase + old name.
    const { error: legacyErr } = await supabase
      .from("tasks")
      .update({ name: newName, template_id: id })
      .is("template_id", null)
      .eq("milestone_id", tpl.milestone_id)
      .eq("name", tpl.name)
      .eq("source", "template");
    if (legacyErr) throw new Error(legacyErr.message);
  }

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

// Reorder tasks within a phase: reassign sequence = position for the given
// ordered list of template-task ids. No revalidate — the client updates
// optimistically, so we avoid a full page re-render on every move.
export async function reorderTemplateTasks(orderedIds: string[]) {
  await requireAnyRole(TEMPLATE_EDITORS);
  if (orderedIds.length === 0) return;
  const supabase = createClient();
  // Issued concurrently — resolves in ~one round trip. Partial-column upsert
  // is avoided because it would trip the NOT NULL columns on insert.
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("task_templates").update({ sequence: index + 1 }).eq("id", id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}

// --- Template task links (named URLs / resources) ---------------------------

export async function addTaskLink(input: {
  templateId: string;
  name: string;
  url: string;
}) {
  const user = await requireAnyRole(TEMPLATE_EDITORS);
  const name = input.name.trim();
  let url = input.url.trim();
  if (!name || !url) throw new Error("A label and URL are both required.");
  // Be forgiving about the scheme so a pasted "example.com" still works.
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("task_template_links")
    .select("sequence")
    .eq("template_id", input.templateId)
    .order("sequence", { ascending: false })
    .limit(1);
  const nextSeq = (existing?.[0]?.sequence ?? 0) + 1;

  const { error } = await supabase.from("task_template_links").insert({
    template_id: input.templateId,
    name,
    url,
    sequence: nextSeq,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  // A template link propagates to every intern who holds a task copied from
  // this template task — notify each of them.
  const [{ data: tpl }, { data: linkedTasks }] = await Promise.all([
    supabase.from("task_templates").select("name").eq("id", input.templateId).single(),
    supabase.from("tasks").select("intern_id").eq("template_id", input.templateId),
  ]);
  const internIds = Array.from(
    new Set((linkedTasks ?? []).map((t: { intern_id: string }) => t.intern_id))
  );
  const recipientIds = await internUserIds(internIds);
  if (recipientIds.length > 0) {
    await notify(
      recipientIds.map((rid) => ({
        userId: rid,
        type: "link_added" as const,
        actorId: user.id,
        actorName: user.full_name ?? user.email,
        data: { taskName: (tpl as { name: string } | null)?.name, linkName: name },
        href: "/intern",
      }))
    );
  }

  revalidateTemplate();
}

export async function updateTaskLink(input: {
  id: string;
  name: string;
  url: string;
}) {
  await requireAnyRole(TEMPLATE_EDITORS);
  const name = input.name.trim();
  let url = input.url.trim();
  if (!name || !url) throw new Error("A label and URL are both required.");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  const supabase = createClient();
  const { error } = await supabase
    .from("task_template_links")
    .update({ name, url })
    .eq("id", input.id);
  if (error) throw new Error(error.message);
  revalidateTemplate();
}

export async function deleteTaskLink(id: string) {
  await requireAnyRole(TEMPLATE_EDITORS);
  const supabase = createClient();
  const { error } = await supabase
    .from("task_template_links")
    .delete()
    .eq("id", id);
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

// Add a new phase (milestone), appended after the last one. When `internId`
// is given the phase is scoped to that intern only; otherwise it is a global
// template phase shared by every intern. A per-intern phase is created empty —
// the mentor adds tasks to it afterward from the intern's Tasks tab.
export async function addMilestone(input: {
  name: string;
  description?: string;
  internId?: string | null;
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
    intern_id: input.internId ?? null,
  });
  if (error) throw new Error(error.message);
  revalidateTemplate();
  if (input.internId) {
    revalidatePath(`/designer/intern/${input.internId}`);
    revalidatePath(`/leader/intern/${input.internId}`);
  }
}

// Delete a whole phase. Cascades to its template tasks and to every intern's
// tasks in that phase (destructive — the UI confirms first).
export async function deleteMilestone(id: string) {
  await requireAnyRole(TEMPLATE_EDITORS);
  const supabase = createClient();
  const { data: milestone } = await supabase
    .from("milestones")
    .select("intern_id")
    .eq("id", id)
    .single();
  const { error } = await supabase.from("milestones").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateTemplate();
  if (milestone?.intern_id) {
    revalidatePath(`/designer/intern/${milestone.intern_id}`);
    revalidatePath(`/leader/intern/${milestone.intern_id}`);
  }
}
