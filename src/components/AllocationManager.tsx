"use client";

import { useState, useTransition } from "react";
import type { InternRow, UserRole, UserRow } from "@/lib/database.types";
import {
  setUserRole,
  allocateIntern,
  createIntern,
  updateInternDates,
} from "@/app/actions/leader";

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
  const nameOf = (id: string | null) =>
    users.find((u) => u.id === id)?.full_name ??
    users.find((u) => u.id === id)?.email ??
    "—";

  return (
    <div className="space-y-8">
      {/* Roles */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Roles</h2>
        <p className="mb-3 text-sm text-slate-500">
          Everyone signs in as an intern by default. Set the right role here.
        </p>
        <ul className="divide-y divide-slate-100">
          {users.map((u) => (
            <RoleRow key={u.id} user={u} />
          ))}
        </ul>
      </section>

      {/* Add intern */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Add an intern</h2>
        {eligibleForIntern.length === 0 ? (
          <p className="text-sm text-slate-500">
            No eligible users. Set a user&apos;s role to “intern” above first.
          </p>
        ) : (
          <AddInternForm users={eligibleForIntern} designers={designers} />
        )}
      </section>

      {/* Allocation */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Allocation</h2>
        {interns.length === 0 ? (
          <p className="text-sm text-slate-500">No interns yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {interns.map((intern) => (
              <AllocationRow
                key={intern.id}
                intern={intern}
                internName={nameOf(intern.user_id)}
                designers={designers}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RoleRow({ user }: { user: UserRow }) {
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
    <li className="flex items-center justify-between py-2.5 text-sm">
      <div>
        <div className="font-medium text-slate-800">
          {user.full_name ?? user.email}
        </div>
        <div className="text-xs text-slate-500">{user.email}</div>
      </div>
      <select
        value={role}
        disabled={pending}
        onChange={(e) => change(e.target.value as UserRole)}
        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
      >
        <option value="intern">Intern</option>
        <option value="designer">Designer / Mentor</option>
        <option value="team_leader">Team Leader</option>
      </select>
    </li>
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
  const [targetHours, setTargetHours] = useState("186");
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
          targetHours: parseInt(targetHours, 10) || 186,
        });
      } catch (err: any) {
        setError(err?.message ?? "Could not create intern.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 text-sm">
      <label>
        <span className="mb-1 block text-slate-500">Person</span>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name ?? u.email}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-1 block text-slate-500">Start date</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5"
        />
      </label>
      <label>
        <span className="mb-1 block text-slate-500">Target hours</span>
        <input
          type="number"
          value={targetHours}
          onChange={(e) => setTargetHours(e.target.value)}
          className="w-24 rounded-md border border-slate-300 px-2 py-1.5"
        />
      </label>
      <label>
        <span className="mb-1 block text-slate-500">Mentor</span>
        <select
          value={designerId}
          onChange={(e) => setDesignerId(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5"
        >
          <option value="">Unassigned</option>
          {designers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.full_name ?? d.email}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        Create intern
      </button>
      {error && <p className="w-full text-red-600">{error}</p>}
    </form>
  );
}

function AllocationRow({
  intern,
  internName,
  designers,
}: {
  intern: InternRow;
  internName: string;
  designers: UserRow[];
}) {
  const [designerId, setDesignerId] = useState(
    intern.allocated_designer_id ?? ""
  );
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
    <li className="flex flex-wrap items-end justify-between gap-3 py-3 text-sm">
      <div className="font-medium text-slate-800">{internName}</div>
      <div className="flex flex-wrap items-end gap-3">
        <label>
          <span className="mb-1 block text-xs text-slate-500">Start</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            onBlur={saveDates}
            className="rounded-md border border-slate-300 px-2 py-1"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs text-slate-500">End</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            onBlur={saveDates}
            className="rounded-md border border-slate-300 px-2 py-1"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs text-slate-500">Mentor</span>
          <select
            value={designerId}
            disabled={pending}
            onChange={(e) => changeDesigner(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1"
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
    </li>
  );
}
