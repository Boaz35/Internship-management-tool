import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { LeaderNav } from "@/components/LeaderNav";
import { AllocationManager } from "@/components/AllocationManager";
import type { InternRow, UserRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function AllocationPage() {
  const user = await requireRole("team_leader");
  const supabase = createClient();

  const [{ data: users }, { data: interns }] = await Promise.all([
    supabase.from("users").select("*").order("full_name"),
    supabase.from("interns").select("*"),
  ]);

  return (
    <>
      <TopBar name={user.full_name} role={user.role} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          People &amp; allocation
        </h1>
        <LeaderNav />
        <AllocationManager
          users={(users as UserRow[]) ?? []}
          interns={(interns as InternRow[]) ?? []}
        />
      </main>
    </>
  );
}
