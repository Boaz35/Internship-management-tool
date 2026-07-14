"use client";

import { useTranslations } from "next-intl";
import type { FeedbackRating } from "@/lib/database.types";
import { RATING_ORDER, ratingColor } from "@/lib/feedback";

// Optional verbal rating: three chips (Excellent / Good / Fair). No numbers.
// Clicking the active chip clears it (rating is optional).
export function VerbalRating({
  value,
  onChange,
}: {
  value: FeedbackRating | null;
  onChange: (next: FeedbackRating | null) => void;
}) {
  const t = useTranslations("feedback");
  const labels: Record<FeedbackRating, string> = {
    excellent: t("ratingExcellent"),
    good: t("ratingGood"),
    fair: t("ratingFair"),
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {RATING_ORDER.map((r) => {
        const active = value === r;
        const c = ratingColor(r);
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(active ? null : r)}
            aria-pressed={active}
            className="ios-pill"
            style={{
              cursor: "pointer",
              padding: "4px 12px",
              fontWeight: 500,
              color: active ? "#fff" : c.fg,
              background: active ? c.fg : c.bg,
              border: "1px solid transparent",
            }}
          >
            {labels[r]}
          </button>
        );
      })}
    </div>
  );
}

// Read-only rating dot for roll-ups / history.
export function RatingDot({ rating }: { rating: FeedbackRating }) {
  const c = ratingColor(rating);
  return (
    <span
      title={rating}
      style={{
        display: "inline-block",
        width: 9,
        height: 9,
        borderRadius: "50%",
        background: c.fg,
      }}
    />
  );
}

// Read-only rating chip label.
export function RatingChip({ rating }: { rating: FeedbackRating }) {
  const t = useTranslations("feedback");
  const labels: Record<FeedbackRating, string> = {
    excellent: t("ratingExcellent"),
    good: t("ratingGood"),
    fair: t("ratingFair"),
  };
  const c = ratingColor(rating);
  return (
    <span
      className="ios-pill"
      style={{ color: c.fg, background: c.bg, fontWeight: 500 }}
    >
      {labels[rating]}
    </span>
  );
}
