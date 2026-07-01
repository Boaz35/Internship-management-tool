"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { HoursType } from "@/lib/database.types";

// Intern marks (or unmarks) a task as completed. Only ever touches
// completed_by_intern; approval is the designer's column.
export async function setTaskCompleted(taskId: string, completed: boolean) {
  const user = await requireUser();
  const supabase = createClient();

  // Guard: only the intern who owns this task may set completion.
  const { data: task } = await supabase
    .from("tasks")
    .select("id, intern_id, interns:intern_id(user_id)")
    .eq("id", taskId)
    .single();

  const ownerId = (task as any)?.interns?.user_id;
  if (!task || ownerId !== user.id) {
    throw new Error("Not allowed to update this task.");
  }

  const { error } = await supabase
    .from("tasks")
    .update({ completed_by_intern: completed })
    .eq("id", taskId);
  if (error) throw new Error(error.message);

  revalidatePath("/intern");
}

async function ownInternId(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("interns")
    .select("id")
    .eq("user_id", userId)
    .single();
  return data?.id ?? null;
}

export async function logHours(input: {
  date: string;
  hours: number;
  type: HoursType;
}) {
  const user = await requireUser();
  const supabase = createClient();
  const internId = await ownInternId(user.id);
  if (!internId) throw new Error("No intern record for this account.");

  const { error } = await supabase.from("hours_logs").insert({
    intern_id: internId,
    date: input.date,
    hours: input.hours,
    type: input.type,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/intern");
}

export async function deleteHoursLog(logId: string) {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from("hours_logs").delete().eq("id", logId);
  if (error) throw new Error(error.message);
  revalidatePath("/intern");
}
