import { Sidebar } from "@/components/Sidebar";
import { LanguageToggle } from "@/components/LanguageToggle";
import type { UserRole } from "@/lib/database.types";

// Full-height shell: fixed sidebar + scrollable main content area.
// The language toggle is pinned to the top-right of the screen on every page.
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
      {/* Pinned to the top trailing corner: top-right in LTR, top-left in RTL. */}
      <div
        style={{
          position: "fixed",
          top: 16,
          insetInlineEnd: 20,
          zIndex: 50,
        }}
      >
        <LanguageToggle />
      </div>
    </div>
  );
}
