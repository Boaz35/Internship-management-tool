import type { HoursLogRow } from "@/lib/database.types";
import {
  summarizeHours,
  projectEndDate,
  formatDate,
} from "@/lib/progress";
import { ProgressBar } from "./ProgressBar";

// Read-only hours summary card: progress toward the target + projected end.
export function HoursOverview({
  logs,
  target,
}: {
  logs: HoursLogRow[];
  target: number;
}) {
  const s = summarizeHours(logs, target);
  const projected = projectEndDate(s.remaining);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <ProgressBar
        percent={s.percent}
        label="Internship progress (hours)"
        sublabel={`${s.worked} of ${s.target} hours`}
      />
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="Worked" value={`${s.worked} h`} />
        <Stat label="Remaining" value={`${s.remaining} h`} />
        <Stat label="Time off" value={`${s.vacation + s.sick} h`} />
        <Stat
          label="Projected end"
          value={s.remaining > 0 ? formatDate(projected) : "Complete"}
        />
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
