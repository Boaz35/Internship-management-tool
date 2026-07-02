"use client";

import { useState, useTransition } from "react";
import type { InternRow, UserRole, UserRow } from "@/lib/database.types";
import {
  setUserRole,
  allocateIntern,
  createIntern,
  updateInternDates,
} from "@/app/actions/leader";
import { Avatar } from "@/components/ui";

export function AllocationManager({
  users,
  interns,
}: {
  users: UserRow[];
  interns: InternRow[];
}) {
  const designers = users.filter((u) => u.role === "designer");
  const internUserIds = new Set(interns.map((i) => i.user_id));
  const eligibleForIntern = users.filter(
    (u) => u.role === "intern" && !internUserIds.has(u.id)
  );
  const nameOf = (id: string | null) => {
    const u = users.find((x) => x.id === id);
    return u?.full_name ?? u?.email ?? "—";
  };

  return (
    <div className="flex flex-col gap-8">
      <Section title="Roles" subtitle="Everyone signs in as an intern by default. Set the right role here.">
        <div>
          {users.map((u, i) => (
            <RoleRow key={u.id} user={u} first={i === 0} />
          ))}
        </div>
      </Section>

      <Section title="Add an intern">
        {eligibleForIntern.length === 0 ? (
          <p style={{ fontSize: 15, color: "var(--label-secondary)" }}>
            No eligible users. Set a user&apos;s role to “intern” above first.
          </p>
        ) : (
          <AddInternForm users={eligibleForIntern} designers={designers} />
        )}
      </Section>

      <Section title="Allocation">
        {interns.length === 0 ? (
          <p style={{ fontSize: 15, color: "var(--label-secondary)" }}>
            No interns yet.
          </p>
        ) : (
          <div>
            {interns.map((intern, i) => (
              <AllocationRow
                key={intern.id}
                intern={intern}
                internName={nameOf(intern.user_id)}
                designers={designers}
                first={i === 0}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ios-card" style={{ padding: "20px 24px" }}>
      <div style={{ fontSize: 17, fontWeight: 590, letterSpacing: "-0.43px" }}>
        {title}
      </div>
      {subtitle && (
        <p style={{ margin: "4px 0 14px", fontSize: 15, color: "var(--label-secondary)" }}>
          {subtitle}
        </p>
      )}
      <div className={subtitle ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

function RoleRow({ user, first }: { user: UserRow; first: boolean }) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [pending, startTransition] = useTransition();

  function change(next: UserRole) {
    setRole(next);
    startTransition(async () => {
      try {
        await setUserRole(user.id, next);
      } catch {
        setRole(user.role);
      }
    });
  }

  return (
    <div
      className="flex items-center justify-between gap-3"
      style={{
        padding: "12px 0",
        borderTop: first ? "none" : "1px solid var(--separator)",
      }}
    >
      <div className="flex items-center gap-3">
        <Avatar name={user.full_name} email={user.email} size={36} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 510 }}>
            {user.full_name ?? user.email}
          </div>
          <div style={{ fontSize: 13, color: "var(--label-secondary)" }}>
            {user.email}
          </div>
        </div>
      </div>
      <select
        value={role}
        disabled={pending}
        onChange={(e) => change(e.target.value as UserRole)}
        className="ios-input"
      >
        <option value="intern">Intern</option>
        <option value="designer">Designer / Mentor</option>
        <option value="team_leader">Team Leader</option>
      </select>
    </div>
  );
}

function AddInternForm({
  users,
  designers,
}: {
  users: UserRow[];
  designers: UserRow[];
}) {
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [designerId, setDesignerId] = useState("");
  const [targetHours, setTargetHours] = useState("180");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createIntern({
          userId,
          startDate,
          designerId: designerId || null,
          targetHours: parseInt(targetHours, 10) || 180,
        });
      } catch (err: any) {
        setError(err?.message ?? "Could not create intern.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-[10px]">
      <label className="block">
        <span className="ios-field-label">Person</span>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="ios-input"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name ?? u.email}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="ios-field-label">Start date</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="ios-input"
        />
      </label>
      <label className="block">
        <span className="ios-field-label">Target hours</span>
        <input
          type="number"
          value={targetHours}
          onChange={(e) => setTargetHours(e.target.value)}
          className="ios-input"
          style={{ width: 90 }}
        />
      </label>
      <label className="block">
        <span className="ios-field-label">Mentor</span>
        <select
          value={designerId}
          onChange={(e) => setDesignerId(e.target.value)}
          className="ios-input"
        >
          <option value="">Unassigned</option>
          {designers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.full_name ?? d.email}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className="ios-btn">
        Create intern
      </button>
      {error && (
        <p style={{ width: "100%", fontSize: 13, color: "var(--terracotta)" }}>{error}</p>
      )}
    </form>
  );
}

function AllocationRow({
  intern,
  internName,
  designers,
  first,
}: {
  intern: InternRow;
  internName: string;
  designers: UserRow[];
  first: boolean;
}) {
  const [designerId, setDesignerId] = useState(intern.allocated_designer_id ?? "");
  const [startDate, setStartDate] = useState(intern.start_date);
  const [endDate, setEndDate] = useState(intern.end_date ?? "");
  const [pending, startTransition] = useTransition();

  function changeDesigner(next: string) {
    setDesignerId(next);
    startTransition(async () => {
      try {
        await allocateIntern(intern.id, next || null);
      } catch {
        setDesignerId(intern.allocated_designer_id ?? "");
      }
    });
  }

  function saveDates() {
    startTransition(async () => {
      try {
        await updateInternDates({
          internId: intern.id,
          startDate,
          endDate: endDate || null,
        });
      } catch {
        /* ignore */
      }
    });
  }

  return (
    <div
      className="flex flex-wrap items-end justify-between gap-3"
      style={{
        padding: "14px 0",
        borderTop: first ? "none" : "1px solid var(--separator)",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 510 }}>{internName}</div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="ios-field-label">Start</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            onBlur={saveDates}
            className="ios-input"
          />
        </label>
        <label className="block">
          <span className="ios-field-label">End</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            onBlur={saveDates}
            className="ios-input"
          />
        </label>
        <label className="block">
          <span className="ios-field-label">Mentor</span>
          <select
            value={designerId}
            disabled={pending}
            onChange={(e) => changeDesigner(e.target.value)}
            className="ios-input"
          >
            <option value="">Unassigned</option>
            {designers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name ?? d.email}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
