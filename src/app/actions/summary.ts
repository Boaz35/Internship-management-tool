"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { summarizeHours, formatDate } from "@/lib/progress";
import type {
  HoursLogRow,
  InternRow,
  MilestoneRow,
  NoteRow,
  TaskRow,
  UserRow,
} from "@/lib/database.types";

async function assertCanAccess(internId: string) {
  const user = await requireUser();
  // Any mentor (designer) or team leader can access any intern's summary.
  if (user.role === "team_leader" || user.role === "designer") return user;
  throw new Error("Not allowed.");
}

// Build a first-draft summary from the intern's data and store it.
export async function generateSummary(internId: string) {
  await assertCanAccess(internId);
  const supabase = createClient();

  const { data: intern } = await supabase
    .from("interns")
    .select("*")
    .eq("id", internId)
    .single<InternRow>();
  if (!intern) throw new Error("Intern not found.");

  const [
    { data: person },
    { data: milestones },
    { data: tasks },
    { data: logs },
    { data: notes },
  ] = await Promise.all([
    supabase.from("users").select("*").eq("id", intern.user_id).single<UserRow>(),
    supabase.from("milestones").select("*").order("sequence"),
    supabase.from("tasks").select("*").eq("intern_id", internId),
    supabase.from("hours_logs").select("*").eq("intern_id", internId),
    supabase
      .from("notes")
      .select("*")
      .eq("intern_id", internId)
      .order("created_at"),
  ]);

  const content = buildSummary({
    person: person as UserRow | null,
    intern,
    milestones: (milestones as MilestoneRow[]) ?? [],
    tasks: (tasks as TaskRow[]) ?? [],
    logs: (logs as HoursLogRow[]) ?? [],
    notes: (notes as NoteRow[]) ?? [],
  });

  const { error } = await supabase
    .from("summaries")
    .upsert({ intern_id: internId, content }, { onConflict: "intern_id" });
  if (error) throw new Error(error.message);

  revalidatePath(`/summary/${internId}`);
  return content;
}

export async function saveSummary(internId: string, content: string) {
  const user = await assertCanAccess(internId);
  const supabase = createClient();
  const { error } = await supabase
    .from("summaries")
    .upsert(
      { intern_id: internId, content, updated_by: user.id },
      { onConflict: "intern_id" }
    );
  if (error) throw new Error(error.message);
  revalidatePath(`/summary/${internId}`);
}

export async function finalizeSummary(internId: string, finalized: boolean) {
  await assertCanAccess(internId);
  const supabase = createClient();
  const { error } = await supabase
    .from("summaries")
    .update({ finalized })
    .eq("intern_id", internId);
  if (error) throw new Error(error.message);
  revalidatePath(`/summary/${internId}`);
}

function buildSummary(data: {
  person: UserRow | null;
  intern: InternRow;
  milestones: MilestoneRow[];
  tasks: TaskRow[];
  logs: HoursLogRow[];
  notes: NoteRow[];
}): string {
  const { person, intern, milestones, tasks, logs, notes } = data;
  const name = person?.full_name ?? person?.email ?? "Intern";
  const hours = summarizeHours(logs, intern.target_hours);

  const lines: string[] = [];
  lines.push(`# Internship Summary — ${name}`);
  lines.push("");
  lines.push(
    `**Period:** ${formatDate(intern.start_date)} – ${formatDate(intern.end_date)}`
  );
  lines.push(
    `**Hours:** ${hours.worked} of ${hours.target} worked` +
      (hours.vacation + hours.sick > 0
        ? ` (${hours.vacation}h vacation, ${hours.sick}h sick)`
        : "")
  );
  lines.push("");

  lines.push("## Program milestones");
  for (const m of milestones) {
    const mt = tasks.filter((t) => t.milestone_id === m.id);
    const approved = mt.filter((t) => t.approved_by_designer);
    lines.push("");
    lines.push(`### ${m.name} — ${approved.length}/${mt.length} completed`);
    for (const t of mt) {
      lines.push(`- [${t.approved_by_designer ? "x" : " "}] ${t.name}`);
    }
  }
  lines.push("");

  lines.push("## Mentor notes");
  if (notes.length === 0) {
    lines.push("_No notes recorded._");
  } else {
    for (const n of notes) {
      lines.push(
        `- ${formatDate(n.created_at)} — ${n.author_name ?? "Mentor"}: ${n.content}`
      );
    }
  }
  lines.push("");
  lines.push("## Mentor's closing remarks");
  lines.push("");
  lines.push("_Add your own summary and tone here before finalizing._");

  return lines.join("\n");
}
