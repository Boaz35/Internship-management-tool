import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";
import { InternDetail } from "@/components/InternDetail";

export const dynamic = "force-dynamic";

export default async function LeaderInternPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole("team_leader");

  return (
    <>
      <TopBar name={user.full_name} role={user.role} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <Link
          href="/leader"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to overview
        </Link>
        <InternDetail internId={params.id} />
      </main>
    </>
  );
}
