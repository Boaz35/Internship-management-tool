"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/notify";

// Resolve the user_id of the intern behind an intern record, for notifying them.
async function internUserId(internId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("interns")
    .select("user_id")
    .eq("id", internId)
    .single();
  return (data as { user_id: string } | null)?.user_id ?? null;
}

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

  // Tell the intern a new task appeared on their program.
  const recipientId = await internUserId(input.internId);
  if (recipientId) {
    await notify({
      userId: recipientId,
      type: "task_added",
      actorId: user.id,
      actorName: user.full_name ?? user.email,
      data: { taskName: input.name },
      href: "/intern",
    });
  }

  revalidatePath(`/designer/intern/${input.internId}`);
}

export async function deleteTask(taskId: string, internId: string) {
  await assertCanMentor(internId);
  const supabase = createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/designer/intern/${internId}`);
}

// --- Per-task resource links -------------------------------------------------

function revalidateTaskLinkRoutes(internId: string) {
  revalidatePath(`/designer/intern/${internId}`);
  revalidatePath(`/leader/intern/${internId}`);
  revalidatePath("/intern");
}

// Attach a named URL to a single task (works for custom and template tasks).
export async function addTaskLink(input: {
  taskId: string;
  internId: string;
  name: string;
  url: string;
}) {
  const user = await assertCanMentor(input.internId);
  const name = input.name.trim();
  let url = input.url.trim();
  if (!name || !url) throw new Error("A label and URL are both required.");
  // Be forgiving about the scheme so a pasted "example.com" still works.
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("task_links")
    .select("sequence")
    .eq("task_id", input.taskId)
    .order("sequence", { ascending: false })
    .limit(1);
  const nextSeq = (existing?.[0]?.sequence ?? 0) + 1;

  const { error } = await supabase.from("task_links").insert({
    task_id: input.taskId,
    name,
    url,
    sequence: nextSeq,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  // Tell the intern a new resource was attached to one of their tasks.
  const recipientId = await internUserId(input.internId);
  if (recipientId) {
    const { data: task } = await supabase
      .from("tasks")
      .select("name")
      .eq("id", input.taskId)
      .single();
    await notify({
      userId: recipientId,
      type: "link_added",
      actorId: user.id,
      actorName: user.full_name ?? user.email,
      data: { taskName: (task as { name: string } | null)?.name, linkName: name },
      href: "/intern",
    });
  }

  revalidateTaskLinkRoutes(input.internId);
}

export async function deleteTaskLink(id: string, internId: string) {
  await assertCanMentor(internId);
  const supabase = createClient();
  const { error } = await supabase.from("task_links").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateTaskLinkRoutes(internId);
}

// --- Intern-uploaded attachments (files + links) -----------------------------
// Mentors and team leaders can view every intern's attachments and remove them
// (e.g. clean-up). Uploading is intern-only — see src/app/actions/intern.ts.
const ATTACHMENT_BUCKET = "task-attachments";

export async function deleteInternAttachment(id: string, internId: string) {
  await assertCanMentor(internId);
  const supabase = createClient();

  const { data: row } = await supabase
    .from("task_attachments")
    .select("kind, storage_path")
    .eq("id", id)
    .eq("intern_id", internId)
    .single();

  const { error } = await supabase.from("task_attachments").delete().eq("id", id);
  if (error) throw new Error(error.message);

  const storagePath = (row as any)?.storage_path as string | null | undefined;
  if ((row as any)?.kind === "file" && storagePath) {
    await supabase.storage.from(ATTACHMENT_BUCKET).remove([storagePath]);
  }

  revalidateTaskLinkRoutes(internId);
}

// NOTE: the free-form private notes feature was replaced by structured mentor
// feedback in v2. See src/app/actions/feedback.ts.
