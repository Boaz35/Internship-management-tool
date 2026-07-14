"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

async function assertCanMentor(internId: string) {
  const user = await requireUser();
  const supabase = createClient();
  const { data: intern } = await supabase
    .from("interns")
    .select("id")
    .eq("id", internId)
    .single();
  // Any mentor (designer) or team leader can mentor any intern.
  const allowed = user.role === "team_leader" || user.role === "designer";
  if (!intern || !allowed) throw new Error("Not allowed for this intern.");
  return user;
}

// Designer approves (or un-approves) a task the intern marked done.
export async function setTaskApproved(
  taskId: string,
  internId: string,
  approved: boolean
) {
  await assertCanMentor(internId);
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ approved_by_designer: approved })
    .eq("id", taskId)
    .eq("intern_id", internId);
  if (error) throw new Error(error.message);

  revalidatePath("/designer");
  revalidatePath(`/designer/intern/${internId}`);
}

// Designer adds a custom task for their own intern.
export async function addCustomTask(input: {
  internId: string;
  milestoneId: string;
  name: string;
}) {
  const user = await assertCanMentor(input.internId);
  const supabase = createClient();
  const { error } = await supabase.from("tasks").insert({
    intern_id: input.internId,
    milestone_id: input.milestoneId,
    name: input.name,
    source: "custom",
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/designer/intern/${input.internId}`);
}

export async function deleteTask(taskId: string, internId: string) {
  await assertCanMentor(internId);
  const supabase = createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/designer/intern/${internId}`);
}

// NOTE: the free-form private notes feature was replaced by structured mentor
// feedback in v2. See src/app/actions/feedback.ts.
