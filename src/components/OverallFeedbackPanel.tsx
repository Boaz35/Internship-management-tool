"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { FeedbackCategoryRow } from "@/lib/database.types";
import { formatDate } from "@/lib/progress";
import { categoryName } from "@/lib/feedback";
import { StarDisplay } from "@/components/StarRating";
import { FeedbackComposer } from "@/components/FeedbackComposer";
import {
  FeedbackHistory,
  type FeedbackEntryView,
} from "@/components/FeedbackHistory";

// The Feedback tab. Three stacked sections:
//  1. Roll-up by category (across every overall feedback entry)
//  2. Feedback history (chronological, collapsible)
//  3. Write overall feedback (shared composer)
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
  const locale = useLocale();

  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  // Flatten every rating with a reference to its source entry.
  const rollup = useMemo(() => {
    type Item = {
      stars: number | null;
      comment: string | null;
      source: string;
      date: string;
    };
    const byCat = new Map<string, Item[]>();
    for (const e of entries) {
      for (const r of e.ratings) {
        const list = byCat.get(r.category_id) ?? [];
        list.push({
          stars: r.stars,
          comment: r.comment,
          source: t("overallSource"),
          date: e.created_at,
        });
        byCat.set(r.category_id, list);
      }
    }
    return [...categories]
      .filter((c) => byCat.has(c.id))
      .sort((a, b) => a.sequence - b.sequence)
      .map((c) => ({ category: c, items: byCat.get(c.id) ?? [] }));
  }, [entries, categories, t]);

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

      {/* 1. Roll-up by category */}
      <div>
        <div className="ios-field-label" style={{ padding: "0 4px" }}>
          {t("rollUpTitle")}
        </div>
        <div className="ios-card" style={{ padding: "16px 18px" }}>
          {rollup.length === 0 ? (
            <div style={{ fontSize: 15, color: "var(--label-tertiary)" }}>
              {t("noEntries")}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {rollup.map(({ category, items }) => (
                <div key={category.id}>
                  <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 500 }}>
                      {categoryName(category, locale)}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--label-secondary)" }}>
                      {t("commentsCount", { count: items.length })}
                    </span>
                  </div>
                  <div
                    className="flex flex-col gap-2"
                    style={{ marginTop: 6, marginInlineStart: 2 }}
                  >
                    {items.map((i, idx) => (
                      <div key={idx} style={{ fontSize: 14, lineHeight: "19px" }}>
                        {i.stars != null && (
                          <span style={{ marginInlineEnd: 6 }}>
                            <StarDisplay value={i.stars} />
                          </span>
                        )}
                        {i.comment && (
                          <span style={{ whiteSpace: "pre-wrap" }}>{i.comment}</span>
                        )}
                        <span style={{ color: "var(--label-tertiary)", fontSize: 12 }}>
                          {" "}
                          — {i.source}, {formatDate(i.date, locale)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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

      {/* 3. Write overall feedback */}
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
    </div>
  );
}
