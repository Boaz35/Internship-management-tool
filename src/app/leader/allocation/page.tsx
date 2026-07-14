import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { AllocationManager } from "@/components/AllocationManager";
import type { InternRow, UserRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function AllocationPage() {
  const user = await requireRole("team_leader");
  const t = await getTranslations("allocation");
  const supabase = createClient();

  const [{ data: users }, { data: interns }] = await Promise.all([
    supabase.from("users").select("*").order("full_name"),
    supabase.from("interns").select("*"),
  ]);

  return (
    <AppShell name={user.full_name} email={user.email} role={user.role}>
      <div className="ios-page">
        <h1 className="ios-h1">{t("title")}</h1>
        <p className="ios-subtitle">{t("subtitle")}</p>
        <div className="mt-8">
          <AllocationManager
            users={(users as UserRow[]) ?? []}
            interns={(interns as InternRow[]) ?? []}
          />
        </div>
      </div>
    </AppShell>
  );
}
