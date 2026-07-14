"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type {
  FeedbackCategoryRow,
  FeedbackEntryRow,
  FeedbackRatingRow,
} from "@/lib/database.types";
import { formatDate } from "@/lib/progress";
import { categoryName } from "@/lib/feedback";
import { StarDisplay } from "@/components/StarRating";
import { deleteFeedbackEntry } from "@/app/actions/feedback";

export interface FeedbackEntryView extends FeedbackEntryRow {
  ratings: FeedbackRatingRow[];
}

// Chronological (newest first) collapsible list of all feedback entries.
export function FeedbackHistory({
  internId,
  entries,
  categoriesById,
  canEdit,
}: {
  internId: string;
  entries: FeedbackEntryView[];
  categoriesById: Map<string, FeedbackCategoryRow>;
  canEdit: boolean;
}) {
  const t = useTranslations("feedback");
  const locale = useLocale();

  if (entries.length === 0) {
    return (
      <div style={{ fontSize: 15, color: "var(--label-tertiary)" }}>
        {t("noEntries")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[10px]">
      {entries.map((e) => (
        <HistoryItem
          key={e.id}
          internId={internId}
          entry={e}
          categoriesById={categoriesById}
          sourceLabel={t("overallSource")}
          locale={locale}
          canEdit={canEdit}
        />
      ))}
    </div>
  );
}

function HistoryItem({
  internId,
  entry,
  categoriesById,
  sourceLabel,
  locale,
  canEdit,
}: {
  internId: string;
  entry: FeedbackEntryView;
  categoriesById: Map<string, FeedbackCategoryRow>;
  sourceLabel: string;
  locale: string;
  canEdit: boolean;
}) {
  const t = useTranslations("feedback");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!confirm(t("confirmDelete"))) return;
    startTransition(async () => {
      try {
        await deleteFeedbackEntry(entry.id, internId);
      } catch {
        /* ignore */
      }
    });
  }

  return (
    <div className="ios-tile" style={{ padding: "12px 14px" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2"
        style={{ textAlign: "start", cursor: "pointer" }}
      >
        <span style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>
          {sourceLabel}
        </span>
        <span style={{ fontSize: 12, color: "var(--label-secondary)" }}>
          {entry.author_name ? t("byAuthor", { author: entry.author_name }) : ""}
        </span>
        <span style={{ fontSize: 12, color: "var(--label-tertiary)" }}>
          {formatDate(entry.created_at, locale)}
        </span>
        <span style={{ fontSize: 12, color: "var(--label-tertiary)" }}>
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div style={{ marginTop: 10 }} className="flex flex-col gap-[10px]">
          {entry.context && (
            <div style={{ fontSize: 14, color: "var(--label-secondary)", fontStyle: "italic" }}>
              {entry.context}
            </div>
          )}
          {entry.ratings.map((r) => {
            const cat = categoriesById.get(r.category_id);
            return (
              <div key={r.id}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 14, fontWeight: 500 }}>
                    {cat ? categoryName(cat, locale) : "—"}
                  </span>
                  {r.stars != null && <StarDisplay value={r.stars} />}
                </div>
                {r.comment && (
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 14,
                      lineHeight: "19px",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {r.comment}
                  </p>
                )}
              </div>
            );
          })}
          {canEdit && (
            <div style={{ textAlign: "end" }}>
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                style={{ fontSize: 12, color: "var(--label-tertiary)", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
