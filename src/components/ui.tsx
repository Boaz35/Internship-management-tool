import type { CSSProperties } from "react";

// A small palette of iOS accent hues used for intern avatars, keyed by a seed.
const AVATAR_HUES = [
  "0,136,255", // blue
  "203,48,224", // purple
  "0,195,208", // teal
  "255,141,40", // orange
  "52,199,89", // green
  "97,85,245", // indigo
];

export function hueForSeed(seed: string): string {
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  return AVATAR_HUES[sum % AVATAR_HUES.length];
}

export function initialsOf(name: string | null | undefined, email?: string) {
  const base = (name && name.trim()) || email || "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  email,
  size = 44,
  seed,
  neutral = false,
}: {
  name?: string | null;
  email?: string;
  size?: number;
  seed?: string;
  neutral?: boolean;
}) {
  const hue = hueForSeed(seed ?? name ?? email ?? "?");
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    background: neutral ? "var(--neutral-avatar)" : `rgba(${hue},0.15)`,
    color: neutral ? "#000" : `rgb(${hue})`,
    fontSize: size >= 52 ? 20 : size >= 44 ? 16 : 13,
    fontWeight: 500,
    flexShrink: 0,
  };
  return (
    <div className="flex items-center justify-center" style={style}>
      {initialsOf(name, email)}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="ios-section-label">{children}</div>;
}

export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="ios-tile">
      <div style={{ fontSize: 13, color: "var(--label-secondary)" }}>{label}</div>
      <div
        style={{
          marginTop: 2,
          fontSize: 19,
          fontWeight: 600,
          letterSpacing: "-0.44px",
        }}
      >
        {value}
      </div>
    </div>
  );
}

type PillTone = "green" | "tint" | "orange" | "neutral" | "red";

const PILL_TONES: Record<PillTone, CSSProperties> = {
  // approved / positive — Forest green
  green: { color: "var(--green)", background: "rgba(31,110,71,0.12)" },
  // awaiting / ready — Neon pink, black text
  tint: { color: "#000", background: "rgba(255,143,176,0.4)" },
  // custom / mentor tag — warn amber
  orange: { color: "var(--warn)", background: "rgba(194,138,26,0.14)" },
  // not started
  neutral: {
    color: "var(--label-secondary)",
    background: "rgba(118,118,128,0.12)",
  },
  // "N to review" badge — solid Neon pink, black text
  red: { color: "#000", background: "var(--tint)", fontWeight: 500 },
};

export function StatusPill({
  tone,
  children,
}: {
  tone: PillTone;
  children: React.ReactNode;
}) {
  return (
    <span className="ios-pill" style={PILL_TONES[tone]}>
      {children}
    </span>
  );
}
