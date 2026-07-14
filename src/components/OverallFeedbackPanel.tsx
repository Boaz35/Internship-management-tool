"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type {
  FeedbackCategoryRow,
  FeedbackRating,
} from "@/lib/database.types";
import { formatDate } from "@/lib/progress";
import { categoryName } from "@/lib/feedback";
import { RatingDot } from "@/components/VerbalRating";
import { FeedbackComposer } from "@/components/FeedbackComposer";
import {
  FeedbackHistory,
  type FeedbackEntryView,
} from "@/components/FeedbackHistory";

// Replaces the old NotesPanel. Three stacked sections:
//  1. Roll-up by category (across every task + overall feedback)
//  2. Feedback history (chronological, collapsible)
//  3. Write overall feedback (shared composer, kind='overall')
export function OverallFeedbackPanel({
  internId,
  categories,
  entries,
  taskNames,
  canEdit = true,
}: {
  internId: string;
  categories: FeedbackCategoryRow[];
  entries: FeedbackEntryView[];
  taskNames: Record<string, string>;
  canEdit?: boolean;
}) {
  const t = useTranslations("feedback");
  const tc = useTranslations("common");
  const locale = useLocale();

  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );
  const taskNameById = useMemo(
    () => new Map(Object.entries(taskNames)),
    [taskNames]
  );

  // Flatten every rating with a reference to its source entry.
  const rollup = useMemo(() => {
    type Item = {
      rating: FeedbackRating | null;
      comment: string | null;
      source: string;
      date: string;
    };
    const byCat = new Map<string, Item[]>();
    for (const e of entries) {
      const source = e.task_id
        ? taskNameById.get(e.task_id) ?? t("overallSource")
        : t("overallSource");
      for (const r of e.ratings) {
        const list = byCat.get(r.category_id) ?? [];
        list.push({
          rating: r.rating,
          comment: r.comment,
          source,
          date: e.created_at,
        });
        byCat.set(r.category_id, list);
      }
    }
    return [...categories]
      .filter((c) => byCat.has(c.id))
      .sort((a, b) => a.sequence - b.sequence)
      .map((c) => ({ category: c, items: byCat.get(c.id) ?? [] }));
  }, [entries, categories, taskNameById, t]);

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
              {rollup.map(({ category, items }) => {
                const counts = { excellent: 0, good: 0, fair: 0 };
                for (const i of items) if (i.rating) counts[i.rating] += 1;
                return (
                  <div key={category.id}>
                    <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 500 }}>
                        {categoryName(category, locale)}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--label-secondary)" }}>
                        {t("commentsCount", { count: items.length })}
                      </span>
                      <span className="flex items-center gap-1">
                        {items
                          .filter((i) => i.rating)
                          .map((i, idx) => (
                            <RatingDot key={idx} rating={i.rating as FeedbackRating} />
                          ))}
                      </span>
                    </div>
                    <div
                      className="flex flex-col gap-1"
                      style={{ marginTop: 6, marginInlineStart: 2 }}
                    >
                      {items
                        .filter((i) => i.comment)
                        .map((i, idx) => (
                          <div key={idx} style={{ fontSize: 14, lineHeight: "19px" }}>
                            <span style={{ whiteSpace: "pre-wrap" }}>{i.comment}</span>
                            <span style={{ color: "var(--label-tertiary)", fontSize: 12 }}>
                              {" "}
                              — {i.source}, {formatDate(i.date, locale)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
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
            taskNameById={taskNameById}
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
              taskId={null}
              kind="overall"
              categories={categories}
              showLiveSummary
            />
          </div>
        </div>
      )}
    </div>
  );
}
