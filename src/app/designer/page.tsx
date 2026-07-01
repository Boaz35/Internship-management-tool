import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { ProgressBar } from "@/components/ProgressBar";
import { summarizeHours } from "@/lib/progress";
import type {
  HoursLogRow,
  InternRow,
  TaskRow,
  UserRow,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function DesignerDashboard() {
  const user = await requireRole("designer");
  const supabase = createClient();

  const { data: interns } = await supabase
    .from("interns")
    .select("*")
    .eq("allocated_designer_id", user.id)
    .returns<InternRow[]>();

  const list = interns ?? [];
  const userIds = list.map((i) => i.user_id);
  const internIds = list.map((i) => i.id);

  const [{ data: users }, { data: tasks }, { data: logs }] = await Promise.all([
    userIds.length
      ? supabase.from("users").select("*").in("id", userIds)
      : Promise.resolve({ data: [] as UserRow[] }),
    internIds.length
      ? supabase.from("tasks").select("*").in("intern_id", internIds)
      : Promise.resolve({ data: [] as TaskRow[] }),
    internIds.length
      ? supabase.from("hours_logs").select("*").in("intern_id", internIds)
      : Promise.resolve({ data: [] as HoursLogRow[] }),
  ]);

  const userById = new Map((users ?? []).map((u) => [u.id, u as UserRow]));

  return (
    <>
      <TopBar name={user.full_name} role={user.role} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Your interns</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review completed tasks, keep notes, and track hours.
          </p>
        </div>

        {list.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            You don&apos;t have any interns allocated yet.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((intern) => {
            const iTasks = (tasks ?? []).filter(
              (t) => t.intern_id === intern.id
            );
            const iLogs = (logs ?? []).filter((l) => l.intern_id === intern.id);
            const pending = iTasks.filter(
              (t) => t.completed_by_intern && !t.approved_by_designer
            ).length;
            const hours = summarizeHours(iLogs, intern.target_hours);
            const person = userById.get(intern.user_id);

            return (
              <Link
                key={intern.id}
                href={`/designer/intern/${intern.id}`}
                className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      {person?.full_name ?? person?.email ?? "Intern"}
                    </h2>
                    <p className="text-xs text-slate-500">{person?.email}</p>
                  </div>
                  {pending > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {pending} to review
                    </span>
                  )}
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
