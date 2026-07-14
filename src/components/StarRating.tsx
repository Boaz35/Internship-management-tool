"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { STAR_MAX } from "@/lib/feedback";

function StarIcon({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "var(--star)" : "none"}
      stroke={filled ? "var(--star)" : "var(--star-empty)"}
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.9l-5.8 3.05 1.1-6.46-4.69-4.58 6.49-.94L12 2.5z" />
    </svg>
  );
}

// Interactive 1–5 stars for the composer. Stars are optional: click the
// currently-selected star again to clear, or use the Clear affordance.
// RTL is handled by the flex row + `dir`; the 1st star is always the start-most.
export function StarRating({
  value,
  onChange,
  size = 24,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  size?: number;
}) {
  const t = useTranslations("feedback");
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;

  function onKeyDown(e: React.KeyboardEvent) {
    // Arrow handling respects visual direction: in RTL, "forward" (ArrowLeft)
    // still increases the value because the start-most star is the 1st.
    const dir = document?.documentElement?.dir === "rtl" ? -1 : 1;
    const cur = value ?? 0;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onChange(Math.min(STAR_MAX, Math.max(1, cur + dir)));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onChange(Math.min(STAR_MAX, Math.max(1, cur - dir)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      onChange(Math.min(STAR_MAX, cur + 1));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (cur <= 1) onChange(null);
      else onChange(cur - 1);
    } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
      e.preventDefault();
      onChange(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div
        role="radiogroup"
        aria-label={t("starsLabel")}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onMouseLeave={() => setHover(null)}
        className="flex items-center"
        style={{ gap: 2, cursor: "pointer", outlineOffset: 3 }}
      >
        {Array.from({ length: STAR_MAX }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={t("starsOf", { n, total: STAR_MAX })}
            tabIndex={-1}
            onClick={() => onChange(value === n ? null : n)}
            onMouseEnter={() => setHover(n)}
            style={{
              padding: 1,
              background: "none",
              border: "none",
              cursor: "pointer",
              lineHeight: 0,
            }}
          >
            <StarIcon filled={n <= shown} size={size} />
          </button>
        ))}
      </div>
      {value != null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          style={{
            fontSize: 12,
            color: "var(--label-tertiary)",
            cursor: "pointer",
            background: "none",
            border: "none",
          }}
        >
          {t("clear")}
        </button>
      )}
    </div>
  );
}

// Read-only stars for roll-up and history.
export function StarDisplay({
  value,
  size = 15,
}: {
  value: number;
  size?: number;
}) {
  const t = useTranslations("feedback");
  return (
    <span
      className="inline-flex items-center"
      style={{ gap: 1, verticalAlign: "middle" }}
      aria-label={t("starsOf", { n: value, total: STAR_MAX })}
      title={t("starsOf", { n: value, total: STAR_MAX })}
    >
      {Array.from({ length: STAR_MAX }, (_, i) => i + 1).map((n) => (
        <StarIcon key={n} filled={n <= value} size={size} />
      ))}
    </span>
  );
}
