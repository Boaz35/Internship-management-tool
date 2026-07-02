import type { HoursLogRow } from "@/lib/database.types";
import { summarizeHours, projectEndDate, formatDate } from "@/lib/progress";
import { ProgressBar } from "./ProgressBar";
import { StatTile } from "./ui";

// Hours summary card: progress toward the target + projected end.
export function HoursOverview({
  logs,
  target,
  title = "Internship progress",
}: {
  logs: HoursLogRow[];
  target: number;
  title?: string;
}) {
  const s = summarizeHours(logs, target);
  const projected = projectEndDate(s.remaining);

  return (
    <div className="ios-card" style={{ padding: "24px 24px 20px" }}>
      <div className="flex items-baseline justify-between">
        <div style={{ fontSize: 15, fontWeight: 590 }}>{title}</div>
        <div style={{ fontSize: 15, color: "var(--label-secondary)" }}>
          {s.worked} of {s.target} hours · {s.percent}%
        </div>
      </div>
      <div className="mt-3">
        <ProgressBar percent={s.percent} />
      </div>
      <div className="mt-[18px] grid grid-cols-2 gap-[10px] sm:grid-cols-4">
        <StatTile label="Worked" value={`${s.worked} h`} />
        <StatTile label="Remaining" value={`${s.remaining} h`} />
        <StatTile label="Time off" value={`${s.vacation + s.sick} h`} />
        <StatTile
          label="Projected end"
          value={s.remaining > 0 ? formatDate(projected) : "Complete"}
        />
      </div>
    </div>
  );
}
