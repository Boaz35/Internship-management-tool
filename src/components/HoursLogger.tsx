"use client";

import { useState, useTransition } from "react";
import type { HoursLogRow, HoursType } from "@/lib/database.types";
import { logHours, deleteHoursLog } from "@/app/actions/intern";
import { formatDate } from "@/lib/progress";

const TYPES: { value: HoursType; label: string }[] = [
  { value: "work", label: "Work" },
  { value: "vacation", label: "Vacation" },
  { value: "sick", label: "Sick" },
];

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
    <div className="ios-card" style={{ padding: "18px 20px 20px" }}>
      <div style={{ fontSize: 17, fontWeight: 590, letterSpacing: "-0.43px" }}>
        Log time
      </div>

      <form onSubmit={submit} className="mt-[14px] flex flex-wrap items-end gap-[10px]">
        <label className="block">
          <span className="ios-field-label">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="ios-input"
          />
        </label>
        <label className="block">
          <span className="ios-field-label">Hours</span>
          <input
            type="number"
            step="0.5"
            min="0"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="ios-input text-center"
            style={{ width: 68 }}
          />
        </label>
        <div>
          <span className="ios-field-label">Type</span>
          <Segmented
            value={type}
            onChange={setType}
            options={TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
        </div>
        <button type="submit" disabled={pending} className="ios-btn">
          Add
        </button>
      </form>
      {error && (
        <p style={{ marginTop: 8, fontSize: 13, color: "var(--red)" }}>{error}</p>
      )}

      <div
        className="mt-5 grid items-center"
        style={{ gridTemplateColumns: "1fr auto auto auto", columnGap: 20 }}
      >
        <HeadCell>Date</HeadCell>
        <HeadCell>Type</HeadCell>
        <HeadCell align="right">Hours</HeadCell>
        <div />
        {logs.map((log) => (
          <RowCells key={log.id}>
            <Cell>{formatDate(log.date)}</Cell>
            <Cell secondary>{TYPE_LABEL[log.type]}</Cell>
            <Cell align="right">{log.hours}</Cell>
            <button
              onClick={() => remove(log.id)}
              style={{
                fontSize: 13,
                color: "var(--red)",
                padding: "10px 0 10px 8px",
                borderTop: "1px solid var(--separator)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              Remove
            </button>
          </RowCells>
        ))}
        {logs.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              paddingTop: 12,
              fontSize: 15,
              color: "var(--label-tertiary)",
            }}
          >
            No time logged yet.
          </div>
        )}
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div
      className="inline-flex items-center"
      style={{
        height: 36,
        borderRadius: 100,
        background: "var(--fill-tertiary)",
        padding: 2,
        gap: 4,
        boxSizing: "border-box",
      }}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="flex items-center self-stretch"
            style={{
              padding: "0 14px",
              borderRadius: 100,
              fontSize: 13.33,
              fontWeight: selected ? 590 : 510,
              background: selected ? "var(--surface)" : "transparent",
              boxShadow: selected ? "var(--pill-shadow)" : "none",
              cursor: "pointer",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function HeadCell({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "right";
}) {
  return (
    <div
      style={{
        fontSize: 13,
        color: "var(--label-secondary)",
        textTransform: "uppercase",
        letterSpacing: "0.02em",
        paddingBottom: 8,
        textAlign: align,
      }}
    >
      {children}
    </div>
  );
}

function RowCells({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Cell({
  children,
  secondary,
  align,
}: {
  children: React.ReactNode;
  secondary?: boolean;
  align?: "right";
}) {
  return (
    <div
      style={{
        fontSize: 15,
        color: secondary ? "var(--label-secondary)" : "var(--label)",
        padding: "10px 0",
        borderTop: "1px solid var(--separator)",
        textAlign: align,
      }}
    >
      {children}
    </div>
  );
}
