"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/database.types";
import { initialsOf } from "@/components/ui";

const ROLE_LABEL: Record<UserRole, string> = {
  intern: "Intern",
  designer: "Mentor",
  team_leader: "Team Leader",
};

type NavItem = { href: string; label: string; icon: React.ReactNode };
type NavGroup = { title: string; items: NavItem[] };

function groupsForRole(role: UserRole): NavGroup[] {
  if (role === "team_leader") {
    return [
      {
        title: "Team Leader",
        items: [
          { href: "/leader", label: "Program overview", icon: <GridIcon /> },
          {
            href: "/leader/allocation",
            label: "People & allocation",
            icon: <PeopleIcon />,
          },
          { href: "/template", label: "Program template", icon: <ListIcon /> },
        ],
      },
    ];
  }
  if (role === "designer") {
    return [
      {
        title: "Mentoring",
        items: [
          { href: "/designer", label: "My interns", icon: <PersonIcon /> },
          { href: "/template", label: "Program template", icon: <ListIcon /> },
        ],
      },
    ];
  }
  return [
    {
      title: "Intern",
      items: [{ href: "/intern", label: "My dashboard", icon: <GaugeIcon /> }],
    },
  ];
}

export function Sidebar({
  name,
  email,
  role,
}: {
  name: string | null;
  email: string;
  role: UserRole;
}) {
  const pathname = usePathname();
  const groups = groupsForRole(role);

  return (
    <aside
      className="flex flex-col"
      style={{
        width: 292,
        flexShrink: 0,
        padding: "24px 16px 16px 20px",
        boxSizing: "border-box",
        height: "100vh",
      }}
    >
      {/* Zemingo wordmark + program eyebrow */}
      <div className="flex flex-col gap-[7px]" style={{ padding: "4px 12px 0" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/zemingo/wordmark.svg"
          alt="Zemingo"
          style={{ width: 130, height: "auto", display: "block" }}
        />
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "var(--label-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Internship program
        </div>
      </div>

      {/* Search (decorative) */}
      <div
        className="flex items-center gap-[7px]"
        style={{
          margin: "18px 0 6px",
          height: 36,
          borderRadius: 100,
          background: "var(--fill-tertiary)",
          padding: "0 12px",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 15 15">
          <circle cx="6.5" cy="6.5" r="4.75" fill="none" stroke="#7D7D7D" strokeWidth="1.5" />
          <line x1="10.2" y1="10.2" x2="13.4" y2="13.4" stroke="#7D7D7D" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 15, color: "var(--label-tertiary)" }}>Search</span>
      </div>

      {/* Nav */}
      <nav className="mt-2 flex flex-1 flex-col gap-[2px] overflow-y-auto">
        {groups.map((group) => (
          <div key={group.title}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--label-secondary)",
                padding: "14px 12px 6px",
              }}
            >
              {group.title}
            </div>
            {group.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/leader" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-[11px]"
                  style={{
                    height: 40,
                    padding: "0 12px",
                    borderRadius: 100,
                    fontSize: 15,
                    background: active ? "var(--sun)" : "transparent",
                    color: "#000",
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User card */}
      <div
        className="flex items-center gap-[10px]"
        style={{
          padding: "10px 12px",
          borderRadius: 100,
          background: "var(--fill-tertiary)",
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "#000",
            color: "#fff",
            fontSize: 13,
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          {initialsOf(name, email)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontSize: 15, fontWeight: 500 }}>
            {name ?? email}
          </div>
          <div style={{ fontSize: 13, color: "var(--label-secondary)" }}>
            {ROLE_LABEL[role]}
          </div>
        </div>
        <form action="/auth/signout" method="post" className="flex">
          <button type="submit" title="Sign out" style={{ cursor: "pointer" }}>
            <svg width="15" height="15" viewBox="0 0 15 15">
              <rect x="1.5" y="1.5" width="8" height="12" rx="2.5" fill="none" stroke="#7D7D7D" strokeWidth="1.4" />
              <line x1="6" y1="7.5" x2="13.5" y2="7.5" stroke="#7D7D7D" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M 11.2 5.3 L 13.5 7.5 L 11.2 9.7" fill="none" stroke="#7D7D7D" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      </div>
    </aside>
  );
}

/* --- Icons (black ink, from the design) --- */
function GridIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17">
      <rect x="1" y="1" width="6.5" height="6.5" rx="2" fill="#000" />
      <rect x="9.5" y="1" width="6.5" height="6.5" rx="2" fill="#000" />
      <rect x="1" y="9.5" width="6.5" height="6.5" rx="2" fill="#000" />
      <rect x="9.5" y="9.5" width="6.5" height="6.5" rx="2" fill="#000" />
    </svg>
  );
}
function PeopleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17">
      <circle cx="6" cy="5.5" r="2.6" fill="#000" />
      <rect x="1.5" y="9.5" width="9" height="5.5" rx="2.75" fill="#000" />
      <circle cx="12.6" cy="5.5" r="2.2" fill="#000" opacity="0.45" />
      <rect x="11" y="9.5" width="4.8" height="5.5" rx="2.4" fill="#000" opacity="0.45" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17">
      <rect x="1.5" y="2.5" width="14" height="2.4" rx="1.2" fill="#000" />
      <rect x="1.5" y="7.3" width="14" height="2.4" rx="1.2" fill="#000" />
      <rect x="1.5" y="12.1" width="9" height="2.4" rx="1.2" fill="#000" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17">
      <circle cx="8.5" cy="5" r="3" fill="#000" />
      <rect x="2.5" y="9.5" width="12" height="6" rx="3" fill="#000" />
    </svg>
  );
}
function GaugeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17">
      <circle cx="8.5" cy="8.5" r="7" fill="none" stroke="#000" strokeWidth="1.6" />
      <line x1="8.5" y1="8.5" x2="12" y2="5.5" stroke="#000" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8.5" cy="8.5" r="1.3" fill="#000" />
    </svg>
  );
}
