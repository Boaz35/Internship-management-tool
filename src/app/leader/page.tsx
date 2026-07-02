import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { Avatar, SectionLabel, StatusPill } from "@/components/ui";
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

  const allUsers = (users as UserRow[]) ?? [];
  const userById = new Map(allUsers.map((u) => [u.id, u]));
  const mentorCount = allUsers.filter((u) => u.role === "designer").length;

  return (
    <AppShell name={user.full_name} email={user.email} role={user.role}>
      <div className="ios-page">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="ios-h1">Program overview</h1>
            <p className="ios-subtitle">
              {list.length} {list.length === 1 ? "intern" : "interns"} ·{" "}
              {mentorCount} {mentorCount === 1 ? "mentor" : "mentors"}
            </p>
          </div>
        </div>

        <div className="mt-9">
          <SectionLabel>Interns</SectionLabel>
        </div>

        {list.length === 0 ? (
          <div
            className="ios-card"
            style={{ padding: "24px 28px", fontSize: 15, color: "var(--label-secondary)" }}
          >
            No interns yet. Add them from{" "}
            <Link href="/leader/allocation" style={{ color: "var(--tint)" }}>
              People &amp; allocation
            </Link>
            .
          </div>
        ) : (
          <div className="ios-card overflow-hidden">
            {list.map((intern, i) => {
              const iTasks = ((tasks as TaskRow[]) ?? []).filter(
                (t) => t.intern_id === intern.id
              );
              const iLogs = ((logs as HoursLogRow[]) ?? []).filter(
                (l) => l.intern_id === intern.id
              );
              const hours = summarizeHours(iLogs, intern.target_hours);
              const approved = iTasks.filter((t) => t.approved_by_designer).length;
              const pending = iTasks.filter(
                (t) => t.completed_by_intern && !t.approved_by_designer
              ).length;
              const person = userById.get(intern.user_id);
              const name = person?.full_name ?? person?.email ?? "Intern";
              const designer = intern.allocated_designer_id
                ? userById.get(intern.allocated_designer_id)
                : null;
              const mentorName =
                designer?.full_name ?? designer?.email ?? "Unassigned";

              return (
                <div key={intern.id}>
                  {i > 0 && (
                    <div
                      style={{
                        height: 1,
                        background: "var(--separator)",
                        marginLeft: 80,
                      }}
                    />
                  )}
                  <Link
                    href={`/leader/intern/${intern.id}`}
                    className="flex items-center gap-4 transition-colors hover:bg-black/[0.03]"
                    style={{ padding: "0 20px", height: 76 }}
                  >
                    <Avatar name={name} email={person?.email} size={44} seed={intern.id} />
                    <div className="min-w-0 flex-1">
                      <div style={{ fontSize: 17, letterSpacing: "-0.43px", lineHeight: "22px" }}>
                        {name}
                      </div>
                      <div
                        style={{
                          fontSize: 15,
                          lineHeight: "20px",
                          color: "var(--label-secondary)",
                        }}
                      >
                        Mentor: {mentorName}
                      </div>
                    </div>
                    {pending > 0 && (
                      <StatusPill tone="red">{pending} to review</StatusPill>
                    )}
                    <div
                      className="flex-shrink-0 text-right"
                      style={{ fontSize: 15, color: "var(--label-secondary)", width: 110 }}
                    >
                      {approved}/{iTasks.length} tasks
                    </div>
                    <div style={{ width: 150, flexShrink: 0 }}>
                      <div className="ios-track" style={{ height: 5 }}>
                        <div
                          className="ios-track-fill"
                          style={{ width: `${hours.percent}%` }}
                        />
                      </div>
                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 13,
                          color: "var(--label-secondary)",
                          textAlign: "right",
                        }}
                      >
                        {hours.worked} of {hours.target} h
                      </div>
                    </div>
                    <svg width="8" height="14" viewBox="0 0 8 14" style={{ flexShrink: 0 }}>
                      <path
                        d="M 1 1 L 7 7 L 1 13"
                        fill="none"
                        stroke="rgba(60,60,67,0.3)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        <p
          style={{
            margin: "10px 20px 0",
            fontSize: 13,
            color: "var(--label-secondary)",
          }}
        >
          Hours count toward the 180-hour target. Vacation and sick days push the
          projected end date instead of reducing the target.
        </p>
      </div>
    </AppShell>
  );
}
