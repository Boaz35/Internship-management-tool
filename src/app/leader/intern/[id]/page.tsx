import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { InternDetail } from "@/components/InternDetail";

export const dynamic = "force-dynamic";

export default async function LeaderInternPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole("team_leader");

  return (
    <AppShell name={user.full_name} email={user.email} role={user.role}>
      <div className="ios-page">
        <InternDetail
          internId={params.id}
          backHref="/leader"
          backLabel="Program overview"
        />
      </div>
    </AppShell>
  );
}
