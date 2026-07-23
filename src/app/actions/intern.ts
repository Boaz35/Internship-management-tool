"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/notify";
import type { HoursType } from "@/lib/database.types";

// Intern marks (or unmarks) a task as completed. Only ever touches
// completed_by_intern; approval is the designer's column.
export async function setTaskCompleted(taskId: string, completed: boolean) {
  const user = await requireUser();
  const supabase = createClient();

  // Guard: only the intern who owns this task may set completion. We also pull
  // the task name + the intern's mentor so we can notify on completion.
  const { data: task } = await supabase
    .from("tasks")
    .select(
      "id, name, intern_id, interns:intern_id(user_id, allocated_designer_id, users:user_id(full_name))"
    )
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

  // Notify the mentor only when a task is completed (not on un-complete).
  if (completed) {
    await notifyTaskCompleted(task, user);
  }

  revalidatePath("/intern");
}

// Tell the relevant mentor an intern completed a task: the allocated designer
// if there is one, otherwise every team leader (so nothing goes unseen when an
// intern hasn't been allocated yet).
async function notifyTaskCompleted(task: any, user: { id: string; full_name: string | null; email: string }) {
  const internId = task.intern_id as string;
  const designerId = task.interns?.allocated_designer_id as string | null;
  const internName = task.interns?.users?.full_name ?? user.full_name ?? user.email;

  let recipientIds: string[] = [];
  if (designerId) {
    recipientIds = [designerId];
  } else {
    const admin = createAdminClient();
    const { data: leaders } = await admin
      .from("users")
      .select("id")
      .eq("role", "team_leader");
    recipientIds = (leaders ?? []).map((l: { id: string }) => l.id);
  }

  if (recipientIds.length === 0) return;
  await notify(
    recipientIds.map((rid) => ({
      userId: rid,
      type: "task_completed" as const,
      actorId: user.id,
      actorName: user.full_name ?? user.email,
      data: { internName, taskName: task.name as string },
      href: `/designer/intern/${internId}`,
    }))
  );
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

// --- Task attachments (intern-owned files + links) ---------------------------
// Interns attach files and links to their OWN tasks. Files live in the private
// "task-attachments" Storage bucket under {intern_id}/{task_id}/…; links are
// stored inline. Every row is tagged with intern_id and guarded by RLS so other
// interns never see them, while mentors and team leaders see all of them.

const ATTACHMENT_BUCKET = "task-attachments";
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // keep in sync with the bucket limit

// Resolve the intern record for a task, but only if it belongs to the caller.
async function ownTaskInternId(userId: string, taskId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("tasks")
    .select("intern_id, interns:intern_id(user_id)")
    .eq("id", taskId)
    .single();
  const ownerId = (data as any)?.interns?.user_id;
  if (!data || ownerId !== userId) {
    throw new Error("Not allowed to attach to this task.");
  }
  return (data as any).intern_id as string;
}

function safeFileName(name: string) {
  const cleaned = name.replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_");
  return cleaned.slice(-120) || "file";
}

// Upload a file the intern picked and record it against one of their tasks.
export async function uploadTaskAttachment(formData: FormData) {
  const user = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const file = formData.get("file");
  if (!taskId) throw new Error("Missing task.");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file provided.");
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error("File is too large (max 25 MB).");

  const internId = await ownTaskInternId(user.id, taskId);
  const supabase = createClient();

  const path = `${internId}/${taskId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error: upErr } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) throw new Error(upErr.message);

  const { error } = await supabase.from("task_attachments").insert({
    task_id: taskId,
    intern_id: internId,
    kind: "file",
    name: file.name,
    storage_path: path,
    mime_type: file.type || null,
    size_bytes: file.size,
    created_by: user.id,
  });
  if (error) {
    // Roll back the orphaned object if the row insert failed.
    await supabase.storage.from(ATTACHMENT_BUCKET).remove([path]);
    throw new Error(error.message);
  }

  revalidatePath("/intern");
}

// Attach a named URL to one of the intern's own tasks.
export async function addTaskAttachmentLink(input: {
  taskId: string;
  name: string;
  url: string;
}) {
  const user = await requireUser();
  const name = input.name.trim();
  let url = input.url.trim();
  if (!name || !url) throw new Error("A label and URL are both required.");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  const internId = await ownTaskInternId(user.id, input.taskId);
  const supabase = createClient();
  const { error } = await supabase.from("task_attachments").insert({
    task_id: input.taskId,
    intern_id: internId,
    kind: "link",
    name,
    url,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/intern");
}

// Intern removes one of their own attachments (file or link).
export async function deleteTaskAttachment(id: string) {
  await requireUser();
  const supabase = createClient();

  // RLS already restricts what this row can be; fetch it to clean up storage.
  const { data: row } = await supabase
    .from("task_attachments")
    .select("kind, storage_path")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("task_attachments").delete().eq("id", id);
  if (error) throw new Error(error.message);

  const storagePath = (row as any)?.storage_path as string | null | undefined;
  if ((row as any)?.kind === "file" && storagePath) {
    await supabase.storage.from(ATTACHMENT_BUCKET).remove([storagePath]);
  }

  revalidatePath("/intern");
}
