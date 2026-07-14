import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { ProgressBar } from "@/components/ProgressBar";
import { Avatar, StatusPill } from "@/components/ui";
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
  const t = await getTranslations("designerDash");
  const tRoles = await getTranslations("roles");
  const supabase = createClient();

  // Mentors see all interns, not just the ones allocated to them.
  const { data: interns } = await supabase
    .from("interns")
    .select("*")
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
    <AppShell name={user.full_name} email={user.email} role={user.role}>
      <div className="ios-page">
        <h1 className="ios-h1">{t("title")}</h1>
        <p className="ios-subtitle">{t("subtitle")}</p>

        {list.length === 0 && (
          <div
            className="ios-card mt-8"
            style={{ padding: "24px 28px", fontSize: 15, color: "var(--label-secondary)" }}
          >
            {t("noInterns")}
          </div>
        )}

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {list.map((intern) => {
            const iTasks = (tasks ?? []).filter((t) => t.intern_id === intern.id);
            const iLogs = (logs ?? []).filter((l) => l.intern_id === intern.id);
            const pending = iTasks.filter(
              (t) => t.completed_by_intern && !t.approved_by_designer
            ).length;
            const approved = iTasks.filter((t) => t.approved_by_designer).length;
            const hours = summarizeHours(iLogs, intern.target_hours);
            const person = userById.get(intern.user_id);
            const name = person?.full_name ?? person?.email ?? tRoles("intern");

            return (
              <Link
                key={intern.id}
                href={`/designer/intern/${intern.id}`}
                className="ios-card block transition-shadow hover:shadow-card"
                style={{ padding: "22px 24px" }}
              >
                <div className="flex items-start gap-[14px]">
                  <Avatar name={name} email={person?.email} size={48} neutral />
                  <div className="min-w-0 flex-1">
                    <div style={{ fontSize: 17, fontWeight: 590, letterSpacing: "-0.43px" }}>
                      {name}
                    </div>
                    <div style={{ fontSize: 15, color: "var(--label-secondary)" }}>
                      {person?.email}
                    </div>
                  </div>
                  {pending > 0 && (
                    <StatusPill tone="red">{t("toReview", { count: pending })}</StatusPill>
                  )}
                </div>
                <div className="mt-5">
                  <ProgressBar percent={hours.percent} height={5} />
                </div>
                <div
                  className="mt-[6px] flex justify-between"
                  style={{ fontSize: 13, color: "var(--label-secondary)" }}
                >
                  <span>
                    {t("tasksApproved", { approved, total: iTasks.length })}
                  </span>
                  <span>
                    {t("hoursShort", { worked: hours.worked, target: hours.target })}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
