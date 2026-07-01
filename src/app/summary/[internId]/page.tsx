import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, homePathForRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { SummaryEditor } from "@/components/SummaryEditor";
import type { InternRow, SummaryRow, UserRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function SummaryPage({
  params,
}: {
  params: { internId: string };
}) {
  const user = await requireUser();
  // Interns cannot view summaries (they contain private notes).
  if (user.role === "intern") redirect(homePathForRole(user.role));

  const supabase = createClient();

  const { data: intern } = await supabase
    .from("interns")
    .select("*")
    .eq("id", params.internId)
    .single<InternRow>();

  if (!intern) {
    return (
      <>
        <TopBar name={user.full_name} role={user.role} />
        <main className="mx-auto max-w-3xl px-4 py-10 text-sm text-slate-500">
          Intern not found or not accessible.
        </main>
      </>
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
    <>
      <TopBar name={user.full_name} role={user.role} />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        <Link href={backHref} className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to {name}
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Summary — {name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Auto-generated from tasks, hours, and notes. Edit freely, then
            finalize and export.
          </p>
        </div>
        <SummaryEditor
          internId={params.internId}
          internName={name}
          initialContent={summary?.content ?? ""}
          initialFinalized={summary?.finalized ?? false}
        />
      </main>
    </>
  );
}
