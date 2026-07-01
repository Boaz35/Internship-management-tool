export function ProgressBar({
  percent,
  label,
  sublabel,
}: {
  percent: number;
  label?: string;
  sublabel?: string;
}) {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <div>
      {(label || sublabel) && (
        <div className="mb-1 flex items-baseline justify-between text-sm">
          {label && <span className="font-medium text-slate-700">{label}</span>}
          {sublabel && <span className="text-slate-500">{sublabel}</span>}
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-brand-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
