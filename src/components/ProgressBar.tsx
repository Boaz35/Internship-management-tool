export function ProgressBar({
  percent,
  label,
  sublabel,
  height = 6,
}: {
  percent: number;
  label?: string;
  sublabel?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <div>
      {(label || sublabel) && (
        <div className="mb-2 flex items-baseline justify-between">
          {label && (
            <span
              style={{ fontSize: 15, fontWeight: 590, letterSpacing: "-0.23px" }}
            >
              {label}
            </span>
          )}
          {sublabel && (
            <span style={{ fontSize: 15, color: "var(--label-secondary)" }}>
              {sublabel}
            </span>
          )}
        </div>
      )}
      <div className="ios-track" style={{ height }}>
        <div className="ios-track-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
