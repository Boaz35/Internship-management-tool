import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { LeaderNav } from "@/components/LeaderNav";
import { ProgressBar } from "@/components/ProgressBar";
import { summarizeHours } from "@/lib/progress";
import type {
  HoursLogRow,
  InternRow,
  TaskRow,
  UserRow,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function LeaderOverview() {
  const user = await requireRole("team_leader");
  const supabase = createClient();

  const { data: interns } = await supabase
    .from("interns")
    .select("*")
    .returns<InternRow[]>();
  const list = interns ?? [];

  const [{ data: users }, { data: tasks }, { data: logs }] = await Promise.all([
    supabase.from("users").select("*"),
    supabase.from("tasks").select("*"),
    supabase.from("hours_logs").select("*"),
  ]);

  const userById = new Map(
    ((users as UserRow[]) ?? []).map((u) => [u.id, u])
  );

  return (
    <>
      <TopBar name={user.full_name} role={user.role} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Program overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            All interns across the program.
          </p>
        </div>
        <LeaderNav />

        {list.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            No interns yet. Add them from{" "}
            <Link href="/leader/allocation" className="text-brand-600">
              People &amp; allocation
            </Link>
            .
          </div>
        )}

        <div className="space-y-4">
          {list.map((intern) => {
            const iTasks = ((tasks as TaskRow[]) ?? []).filter(
              (t) => t.intern_id === intern.id
            );
            const iLogs = ((logs as HoursLogRow[]) ?? []).filter(
              (l) => l.intern_id === intern.id
            );
            const hours = summarizeHours(iLogs, intern.target_hours);
            const approved = iTasks.filter((t) => t.approved_by_designer).length;
            const person = userById.get(intern.user_id);
            const designer = intern.allocated_designer_id
              ? userById.get(intern.allocated_designer_id)
              : null;

            return (
              <Link
                key={intern.id}
                href={`/leader/intern/${intern.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      {person?.full_name ?? person?.email ?? "Intern"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Mentor:{" "}
                      {designer?.full_name ?? designer?.email ?? "Unassigned"}
                    </p>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    {approved}/{iTasks.length} tasks approved
                  </div>
                </div>
                <div className="mt-4">
                  <ProgressBar
                    percent={hours.percent}
                    sublabel={`${hours.worked}/${hours.target} h`}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
