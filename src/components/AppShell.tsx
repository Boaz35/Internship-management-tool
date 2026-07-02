import { Sidebar } from "@/components/Sidebar";
import type { UserRole } from "@/lib/database.types";

// Full-height shell: fixed sidebar + scrollable main content area.
export function AppShell({
  name,
  email,
  role,
  children,
}: {
  name: string | null;
  email: string;
  role: UserRole;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar name={name} email={email} role={role} />
      <main style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>{children}</main>
    </div>
  );
}
