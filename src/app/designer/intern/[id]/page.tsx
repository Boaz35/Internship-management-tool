import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { InternDetail } from "@/components/InternDetail";

export const dynamic = "force-dynamic";

export default async function DesignerInternPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole("designer");

  return (
    <AppShell name={user.full_name} email={user.email} role={user.role}>
      <div className="ios-page">
        <InternDetail
          internId={params.id}
          backHref="/designer"
          backLabel="Your interns"
        />
      </div>
    </AppShell>
  );
}
