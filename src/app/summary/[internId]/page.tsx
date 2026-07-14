import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser, homePathForRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { SummaryEditor } from "@/components/SummaryEditor";
import type { InternRow, SummaryRow, UserRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function SummaryPage({
  params,
}: {
  params: { internId: string };
}) {
  const user = await requireUser();
  // Interns cannot view summaries (they contain private feedback).
  if (user.role === "intern") redirect(homePathForRole(user.role));

  const t = await getTranslations("summary");
  const tc = await getTranslations("common");
  const supabase = createClient();

  const { data: intern } = await supabase
    .from("interns")
    .select("*")
    .eq("id", params.internId)
    .single<InternRow>();

  if (!intern) {
    return (
      <AppShell name={user.full_name} email={user.email} role={user.role}>
        <div className="ios-page">
          <div
            className="ios-card"
            style={{ padding: "24px 28px", fontSize: 15, color: "var(--label-secondary)" }}
          >
            {tc("notFound")}
          </div>
        </div>
      </AppShell>
    );
  }

  const [{ data: person }, { data: summary }] = await Promise.all([
    supabase.from("users").select("*").eq("id", intern.user_id).single<UserRow>(),
    supabase
      .from("summaries")
      .select("*")
      .eq("intern_id", params.internId)
      .maybeSingle<SummaryRow>(),
  ]);

  const name = person?.full_name ?? person?.email ?? "Intern";
  const backHref =
    user.role === "team_leader"
      ? `/leader/intern/${params.internId}`
      : `/designer/intern/${params.internId}`;

  return (
    <AppShell name={user.full_name} email={user.email} role={user.role}>
      <div className="ios-page">
        <Link
          href={backHref}
          className="mb-[14px] inline-flex items-center gap-[6px]"
          style={{ fontSize: 15, color: "var(--tint)" }}
        >
          <svg width="8" height="14" viewBox="0 0 8 14" style={{ transform: "scaleX(var(--dir-flip, 1))" }}>
            <path
              d="M 7 1 L 1 7 L 7 13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{t("backTo", { name })}</span>
        </Link>
        <h1 className="ios-h1">{t("pageTitle", { name })}</h1>
        <p className="ios-subtitle">{t("pageSubtitle")}</p>
        <div className="mt-8">
          <SummaryEditor
            internId={params.internId}
            internName={name}
            initialContent={summary?.content ?? ""}
            initialFinalized={summary?.finalized ?? false}
          />
        </div>
      </div>
    </AppShell>
  );
}
