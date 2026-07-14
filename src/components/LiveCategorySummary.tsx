"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { FeedbackCategoryRow, FeedbackRating } from "@/lib/database.types";
import { categoryName } from "@/lib/feedback";

export interface DraftRating {
  rating: FeedbackRating | null;
  comment: string;
}

// Live, grouped-by-category text block assembled as the mentor writes.
// A drafting aid with a Copy button — not persisted separately.
export function LiveCategorySummary({
  categories,
  selected,
  drafts,
}: {
  categories: FeedbackCategoryRow[];
  selected: Set<string>;
  drafts: Record<string, DraftRating>;
}) {
  const t = useTranslations("feedback");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);

  const ratingLabel: Record<FeedbackRating, string> = {
    excellent: t("ratingExcellent"),
    good: t("ratingGood"),
    fair: t("ratingFair"),
  };

  const lines: string[] = [];
  for (const cat of categories) {
    if (!selected.has(cat.id)) continue;
    const d = drafts[cat.id];
    if (!d) continue;
    const hasComment = d.comment.trim().length > 0;
    if (!d.rating && !hasComment) continue;
    const parts: string[] = [];
    if (d.rating) parts.push(ratingLabel[d.rating]);
    if (hasComment) parts.push(d.comment.trim());
    lines.push(`• ${categoryName(cat, locale)}: ${parts.join(" — ")}`);
  }
  const text = lines.join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  if (lines.length === 0) return null;

  return (
    <div className="ios-tile" style={{ padding: "12px 14px" }}>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{t("liveSummary")}</div>
        <button
          type="button"
          onClick={copy}
          style={{ fontSize: 12, color: "var(--tint)", cursor: "pointer" }}
        >
          {copied ? tc("copied") : tc("copy")}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          fontFamily: "inherit",
          fontSize: 14,
          lineHeight: "20px",
          color: "var(--label)",
        }}
      >
        {text}
      </pre>
      <div style={{ marginTop: 6, fontSize: 11, color: "var(--label-tertiary)" }}>
        {t("liveSummaryHint")}
      </div>
    </div>
  );
}
