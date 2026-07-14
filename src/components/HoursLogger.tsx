"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { HoursLogRow, HoursType } from "@/lib/database.types";
import { logHours, deleteHoursLog } from "@/app/actions/intern";
import { formatDate } from "@/lib/progress";

export function HoursLogger({ logs }: { logs: HoursLogRow[] }) {
  const t = useTranslations("hoursLogger");
  const locale = useLocale();
  const typeLabel: Record<HoursType, string> = {
    work: t("work"),
    vacation: t("vacation"),
    sick: t("sick"),
  };
  const types: HoursType[] = ["work", "vacation", "sick"];
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
      setError(t("enterHours"));
      return;
    }
    startTransition(async () => {
      try {
        await logHours({ date, hours: h, type });
      } catch (err: any) {
        setError(err?.message ?? t("couldNotSave"));
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
        {t("title")}
      </div>

      <form onSubmit={submit} className="mt-[14px] flex flex-wrap items-end gap-[10px]">
        <label className="block">
          <span className="ios-field-label">{t("date")}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="ios-input"
          />
        </label>
        <label className="block">
          <span className="ios-field-label">{t("hours")}</span>
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
          <span className="ios-field-label">{t("type")}</span>
          <Segmented
            value={type}
            onChange={setType}
            options={types.map((v) => ({ value: v, label: typeLabel[v] }))}
          />
        </div>
        <button type="submit" disabled={pending} className="ios-btn">
          {t("add")}
        </button>
      </form>
      {error && (
        <p style={{ marginTop: 8, fontSize: 13, color: "var(--red)" }}>{error}</p>
      )}

      <div
        className="mt-5 grid items-center"
        style={{ gridTemplateColumns: "1fr auto auto auto", columnGap: 20 }}
      >
        <HeadCell>{t("date")}</HeadCell>
        <HeadCell>{t("type")}</HeadCell>
        <HeadCell align="end">{t("hours")}</HeadCell>
        <div />
        {logs.map((log) => (
          <RowCells key={log.id}>
            <Cell>{formatDate(log.date, locale)}</Cell>
            <Cell secondary>{typeLabel[log.type]}</Cell>
            <Cell align="end">{log.hours}</Cell>
            <button
              onClick={() => remove(log.id)}
              style={{
                fontSize: 13,
                color: "var(--terracotta)",
                padding: "10px 0",
                paddingInlineStart: 8,
                borderTop: "1px solid var(--separator)",
                cursor: "pointer",
                textAlign: "start",
              }}
            >
              {t("remove")}
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
            {t("noTime")}
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
              fontSize: 13,
              fontWeight: selected ? 500 : 400,
              background: selected ? "var(--sun)" : "transparent",
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
  align?: "start" | "end";
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
  align?: "start" | "end";
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
