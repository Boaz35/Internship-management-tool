import Link from "next/link";
import type { UserRole } from "@/lib/database.types";

const ROLE_LABEL: Record<UserRole, string> = {
  intern: "Intern",
  designer: "Mentor",
  team_leader: "Team Leader",
};

export function TopBar({
  name,
  role,
}: {
  name: string | null;
  role: UserRole;
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-semibold text-slate-900">
          Internship Program
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-slate-500 sm:inline">
            {name ?? "Signed in"}
          </span>
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
            {ROLE_LABEL[role]}
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
