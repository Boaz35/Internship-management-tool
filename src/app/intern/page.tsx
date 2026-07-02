import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { HoursOverview } from "@/components/HoursOverview";
import { HoursLogger } from "@/components/HoursLogger";
import { InternTaskList } from "@/components/InternTaskList";
import { SectionLabel } from "@/components/ui";
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
      <AppShell name={user.full_name} email={user.email} role={user.role}>
        <div className="ios-page">
          <div
            className="ios-card"
            style={{ padding: "24px 28px", fontSize: 15, color: "var(--label-secondary)" }}
          >
            Your internship hasn&apos;t been set up yet. A team leader needs to
            create your intern record. Check back shortly.
          </div>
        </div>
      </AppShell>
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

  const firstName = user.full_name ? user.full_name.split(" ")[0] : null;

  return (
    <AppShell name={user.full_name} email={user.email} role={user.role}>
      <div className="ios-page">
        <h1 className="ios-h1">Welcome{firstName ? `, ${firstName}` : ""}</h1>
        <p className="ios-subtitle">Track your tasks and log your hours here.</p>

        <div className="mt-8">
          <HoursOverview
            logs={(logs as HoursLogRow[]) ?? []}
            target={intern.target_hours}
          />
        </div>

        <div className="mt-8 grid items-start gap-7 lg:grid-cols-2">
          <div>
            <SectionLabel>Your program</SectionLabel>
            <InternTaskList
              milestones={(milestones as MilestoneRow[]) ?? []}
              tasks={(tasks as TaskRow[]) ?? []}
            />
          </div>
          <div>
            <SectionLabel>Hours</SectionLabel>
            <HoursLogger logs={(logs as HoursLogRow[]) ?? []} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
