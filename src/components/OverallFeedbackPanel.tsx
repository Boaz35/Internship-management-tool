"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { FeedbackCategoryRow } from "@/lib/database.types";
import { FeedbackComposer } from "@/components/FeedbackComposer";
import {
  FeedbackHistory,
  type FeedbackEntryView,
} from "@/components/FeedbackHistory";

// The Feedback tab. Two stacked sections:
//  1. Write overall feedback (shared composer)
//  2. Feedback history (chronological, collapsible)
export function OverallFeedbackPanel({
  internId,
  categories,
  entries,
  canEdit = true,
}: {
  internId: string;
  categories: FeedbackCategoryRow[];
  entries: FeedbackEntryView[];
  canEdit?: boolean;
}) {
  const t = useTranslations("feedback");
  const tc = useTranslations("common");

  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-baseline justify-between" style={{ padding: "0 4px" }}>
        <div className="ios-section-label" style={{ padding: 0 }}>
          {t("overallTitle")}
        </div>
        <div style={{ fontSize: 12, color: "var(--label-tertiary)" }}>
          {tc("notVisibleToIntern")}
        </div>
      </div>

      {/* 1. Write overall feedback */}
      {canEdit && (
        <div>
          <div className="ios-field-label" style={{ padding: "0 4px" }}>
            {t("writeOverallTitle")}
          </div>
          <div className="ios-card" style={{ padding: "18px 20px 20px" }}>
            <FeedbackComposer
              internId={internId}
              categories={categories}
              showLiveSummary
            />
          </div>
        </div>
      )}

      {/* 2. Feedback history */}
      <div>
        <div className="ios-field-label" style={{ padding: "0 4px" }}>
          {t("historyTitle")}
        </div>
        <div className="ios-card" style={{ padding: "16px 18px" }}>
          <FeedbackHistory
            internId={internId}
            entries={entries}
            categoriesById={categoriesById}
            canEdit={canEdit}
          />
        </div>
      </div>
    </div>
  );
}
