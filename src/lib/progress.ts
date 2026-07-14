import type { HoursLogRow, TaskRow } from "@/lib/database.types";

export const HOURS_PER_DAY = 9;

export interface HoursSummary {
  worked: number; // work hours only — count toward the target
  vacation: number;
  sick: number;
  target: number;
  remaining: number; // work hours still needed
  percent: number; // 0–100 toward target
}

export function summarizeHours(
  logs: Pick<HoursLogRow, "hours" | "type">[],
  target: number
): HoursSummary {
  let worked = 0;
  let vacation = 0;
  let sick = 0;
  for (const log of logs) {
    const h = Number(log.hours) || 0;
    if (log.type === "work") worked += h;
    else if (log.type === "vacation") vacation += h;
    else if (log.type === "sick") sick += h;
  }
  const remaining = Math.max(0, target - worked);
  const percent = target > 0 ? Math.min(100, Math.round((worked / target) * 100)) : 0;
  return { worked, vacation, sick, target, remaining, percent };
}

// Vacation/sick days don't reduce the target — they extend the calendar.
// Project the end date from today by counting the remaining work at
// ~HOURS_PER_DAY per working day (weekends skipped).
export function projectEndDate(
  remainingHours: number,
  from: Date = new Date()
): Date {
  let workDaysNeeded = Math.ceil(remainingHours / HOURS_PER_DAY);
  const d = new Date(from);
  if (workDaysNeeded <= 0) return d;
  while (workDaysNeeded > 0) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) workDaysNeeded -= 1; // skip Sat/Sun
  }
  return d;
}

export interface MilestoneProgress {
  total: number;
  approved: number;
  percent: number;
}

export function milestoneProgress(tasks: TaskRow[]): MilestoneProgress {
  const total = tasks.length;
  const approved = tasks.filter((t) => t.approved_by_designer).length;
  const percent = total > 0 ? Math.round((approved / total) * 100) : 0;
  return { total, approved, percent };
}

export function formatDate(
  value: string | Date | null,
  locale?: string
): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const intlLocale =
    locale === "he" ? "he-IL" : locale === "en" ? "en-US" : undefined;
  return d.toLocaleDateString(intlLocale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
