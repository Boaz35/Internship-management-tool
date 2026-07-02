"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/database.types";
import { Avatar } from "@/components/ui";

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
          {
            href: "/template",
            label: "Program template",
            icon: <ListIcon />,
          },
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
      {/* Logo */}
      <div className="flex items-center gap-[10px] px-3">
        <div
          className="flex items-center justify-center"
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: "var(--tint)",
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <circle cx="8" cy="5" r="3" fill="white" />
            <rect x="2.5" y="9.5" width="11" height="6.5" rx="3.25" fill="white" />
          </svg>
        </div>
        <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.44px" }}>
          Internship
        </div>
      </div>

      {/* Nav */}
      <nav className="mt-4 flex flex-1 flex-col gap-[2px] overflow-y-auto">
        {groups.map((group) => (
          <div key={group.title}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
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
                    background: active ? "var(--surface)" : "transparent",
                    color: active ? "var(--tint)" : "var(--label)",
                    fontWeight: active ? 590 : 400,
                    boxShadow: active ? "var(--card-shadow-hover)" : "none",
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
        <Avatar name={name} email={email} size={34} />
        <div className="min-w-0 flex-1">
          <div
            className="truncate"
            style={{ fontSize: 15, fontWeight: 590 }}
          >
            {name ?? email}
          </div>
          <div style={{ fontSize: 13, color: "var(--label-secondary)" }}>
            {ROLE_LABEL[role]}
          </div>
        </div>
        <form action="/auth/signout" method="post" className="flex">
          <button type="submit" title="Sign out" style={{ cursor: "pointer" }}>
            <svg width="15" height="15" viewBox="0 0 15 15">
              <rect
                x="1.5"
                y="1.5"
                width="8"
                height="12"
                rx="2.5"
                fill="none"
                stroke="rgba(60,60,67,0.6)"
                strokeWidth="1.4"
              />
              <line
                x1="6"
                y1="7.5"
                x2="13.5"
                y2="7.5"
                stroke="rgba(60,60,67,0.6)"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <path
                d="M 11.2 5.3 L 13.5 7.5 L 11.2 9.7"
                fill="none"
                stroke="rgba(60,60,67,0.6)"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>
      </div>
    </aside>
  );
}

/* --- Icons (tint-filled, from the design) --- */
function GridIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17">
      <rect x="1" y="1" width="6.5" height="6.5" rx="2" fill="var(--tint)" />
      <rect x="9.5" y="1" width="6.5" height="6.5" rx="2" fill="var(--tint)" />
      <rect x="1" y="9.5" width="6.5" height="6.5" rx="2" fill="var(--tint)" />
      <rect x="9.5" y="9.5" width="6.5" height="6.5" rx="2" fill="var(--tint)" />
    </svg>
  );
}
function PeopleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17">
      <circle cx="6" cy="5.5" r="2.6" fill="var(--tint)" />
      <rect x="1.5" y="9.5" width="9" height="5.5" rx="2.75" fill="var(--tint)" />
      <circle cx="12.6" cy="5.5" r="2.2" fill="var(--tint)" opacity="0.45" />
      <rect
        x="11"
        y="9.5"
        width="4.8"
        height="5.5"
        rx="2.4"
        fill="var(--tint)"
        opacity="0.45"
      />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17">
      <rect x="1.5" y="2.5" width="14" height="2.4" rx="1.2" fill="var(--tint)" />
      <rect x="1.5" y="7.3" width="14" height="2.4" rx="1.2" fill="var(--tint)" />
      <rect x="1.5" y="12.1" width="9" height="2.4" rx="1.2" fill="var(--tint)" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17">
      <circle cx="8.5" cy="5" r="3" fill="var(--tint)" />
      <rect x="2.5" y="9.5" width="12" height="6" rx="3" fill="var(--tint)" />
    </svg>
  );
}
function GaugeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17">
      <circle
        cx="8.5"
        cy="8.5"
        r="7"
        fill="none"
        stroke="var(--tint)"
        strokeWidth="1.6"
      />
      <line
        x1="8.5"
        y1="8.5"
        x2="12"
        y2="5.5"
        stroke="var(--tint)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="8.5" cy="8.5" r="1.3" fill="var(--tint)" />
    </svg>
  );
}
