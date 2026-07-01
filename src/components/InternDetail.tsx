import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HoursOverview } from "@/components/HoursOverview";
import { DesignerTaskList } from "@/components/DesignerTaskList";
import { NotesPanel } from "@/components/NotesPanel";
import { formatDate } from "@/lib/progress";
import type {
  HoursLogRow,
  InternRow,
  MilestoneRow,
  NoteRow,
  TaskRow,
  UserRow,
} from "@/lib/database.types";

// Full per-intern view. Used by the designer (their intern) and the team
// leader (drill-down). RLS ensures only permitted rows come back.
export async function InternDetail({ internId }: { internId: string }) {
  const supabase = createClient();

  const { data: intern } = await supabase
    .from("interns")
    .select("*")
    .eq("id", internId)
    .single<InternRow>();

  if (!intern) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Intern not found or not accessible.
      </div>
    );
  }

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
    supabase
      .from("hours_logs")
      .select("*")
      .eq("intern_id", internId)
      .order("date", { ascending: false }),
    supabase
      .from("notes")
      .select("*")
      .eq("intern_id", internId)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {person?.full_name ?? person?.email ?? "Intern"}
            </h1>
            <p className="text-sm text-slate-500">{person?.email}</p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <div>Start: {formatDate(intern.start_date)}</div>
            <div>End: {formatDate(intern.end_date)}</div>
          </div>
        </div>
        <div className="mt-4">
          <Link
            href={`/summary/${internId}`}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            View / edit summary document →
          </Link>
        </div>
      </div>

      <HoursOverview
        logs={(logs as HoursLogRow[]) ?? []}
        target={intern.target_hours}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Tasks</h2>
          <DesignerTaskList
            internId={internId}
            milestones={(milestones as MilestoneRow[]) ?? []}
            tasks={(tasks as TaskRow[]) ?? []}
          />
        </div>
        <div>
          <NotesPanel internId={internId} notes={(notes as NoteRow[]) ?? []} />
        </div>
      </div>
    </div>
  );
}
