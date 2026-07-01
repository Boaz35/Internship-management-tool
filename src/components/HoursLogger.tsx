"use client";

import { useState, useTransition } from "react";
import type { HoursLogRow, HoursType } from "@/lib/database.types";
import { logHours, deleteHoursLog } from "@/app/actions/intern";
import { formatDate } from "@/lib/progress";

const TYPE_LABEL: Record<HoursType, string> = {
  work: "Work",
  vacation: "Vacation",
  sick: "Sick",
};

export function HoursLogger({ logs }: { logs: HoursLogRow[] }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState("9");
  const [type, setType] = useState<HoursType>("work");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const h = parseFloat(hours);
    if (Number.isNaN(h) || h <= 0) {
      setError("Enter a number of hours greater than 0.");
      return;
    }
    startTransition(async () => {
      try {
        await logHours({ date, hours: h, type });
      } catch (err: any) {
        setError(err?.message ?? "Could not save.");
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      try {
        await deleteHoursLog(id);
      } catch {
        /* ignore */
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-3 font-semibold text-slate-900">Log time</h3>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Hours</span>
          <input
            type="number"
            step="0.5"
            min="0"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as HoursType)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="work">Work</option>
            <option value="vacation">Vacation</option>
            <option value="sick">Sick</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Add
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 max-h-64 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="pb-2">Date</th>
              <th className="pb-2">Type</th>
              <th className="pb-2 text-right">Hours</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="py-2 text-slate-700">{formatDate(log.date)}</td>
                <td className="py-2 text-slate-500">{TYPE_LABEL[log.type]}</td>
                <td className="py-2 text-right text-slate-700">{log.hours}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => remove(log.id)}
                    className="text-xs text-slate-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 text-slate-400">
                  No time logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
