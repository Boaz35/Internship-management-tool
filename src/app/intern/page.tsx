import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { HoursOverview } from "@/components/HoursOverview";
import { HoursLogger } from "@/components/HoursLogger";
import { InternTaskList } from "@/components/InternTaskList";
import type {
  HoursLogRow,
  InternRow,
  MilestoneRow,
  TaskRow,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function InternDashboard() {
  const user = await requireRole("intern");
  const supabase = createClient();

  const { data: intern } = await supabase
    .from("interns")
    .select("*")
    .eq("user_id", user.id)
    .single<InternRow>();

  if (!intern) {
    return (
      <>
        <TopBar name={user.full_name} role={user.role} />
        <main className="mx-auto max-w-5xl px-4 py-10">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            Your internship hasn&apos;t been set up yet. A team leader needs to
            create your intern record. Check back shortly.
          </div>
        </main>
      </>
    );
  }

  const [{ data: milestones }, { data: tasks }, { data: logs }] =
    await Promise.all([
      supabase.from("milestones").select("*").order("sequence"),
      supabase.from("tasks").select("*").eq("intern_id", intern.id),
      supabase
        .from("hours_logs")
        .select("*")
        .eq("intern_id", intern.id)
        .order("date", { ascending: false }),
    ]);

  return (
    <>
      <TopBar name={user.full_name} role={user.role} />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Welcome{user.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track your tasks and log your hours here.
          </p>
        </div>

        <HoursOverview
          logs={(logs as HoursLogRow[]) ?? []}
          target={intern.target_hours}
        />

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Your program
            </h2>
            <InternTaskList
              milestones={(milestones as MilestoneRow[]) ?? []}
              tasks={(tasks as TaskRow[]) ?? []}
            />
          </div>
          <div>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Hours</h2>
            <HoursLogger logs={(logs as HoursLogRow[]) ?? []} />
          </div>
        </div>
      </main>
    </>
  );
}
