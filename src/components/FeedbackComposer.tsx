"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { FeedbackCategoryRow } from "@/lib/database.types";
import { categoryName, categoryTag } from "@/lib/feedback";
import { createFeedbackEntry } from "@/app/actions/feedback";
import { CategoryChips } from "@/components/CategoryChips";
import { AddCategoryForm } from "@/components/AddCategoryForm";
import { StarRating } from "@/components/StarRating";
import {
  LiveCategorySummary,
  type DraftRating,
} from "@/components/LiveCategorySummary";

// Composer for overall feedback (feedback v3: overall is the only kind).
// Each addressed category takes an optional 1–5 star rating and a comment.
export function FeedbackComposer({
  internId,
  categories: initialCategories,
  onSaved,
  showLiveSummary = false,
}: {
  internId: string;
  categories: FeedbackCategoryRow[];
  onSaved?: () => void;
  showLiveSummary?: boolean;
}) {
  const t = useTranslations("feedback");
  const locale = useLocale();

  const [categories, setCategories] = useState(initialCategories);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, DraftRating>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const sortedCategories = useMemo(
    () =>
      [...categories]
        .filter((c) => c.active)
        .sort((a, b) => a.sequence - b.sequence),
    [categories]
  );

  function toggle(id: string) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        setDrafts((d) =>
          d[id] ? d : { ...d, [id]: { stars: null, comment: "" } }
        );
      }
      return next;
    });
  }

  function setStars(id: string, stars: number | null) {
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? { comment: "" }), stars } }));
  }
  function setComment(id: string, comment: string) {
    setDrafts((d) => ({
      ...d,
      [id]: { ...(d[id] ?? { stars: null }), comment },
    }));
  }

  function onCreated(cat: FeedbackCategoryRow) {
    setCategories((prev) =>
      prev.some((c) => c.id === cat.id) ? prev : [...prev, cat]
    );
    toggle(cat.id);
  }

  function reset() {
    setSelected(new Set());
    setDrafts({});
  }

  function save() {
    setError(null);
    const ratings = Array.from(selected).map((categoryId) => ({
      categoryId,
      stars: drafts[categoryId]?.stars ?? null,
      comment: drafts[categoryId]?.comment ?? null,
    }));
    if (ratings.length === 0) {
      setError(t("selectAtLeastOne"));
      return;
    }
    startTransition(async () => {
      try {
        await createFeedbackEntry({
          internId,
          context: null,
          ratings,
        });
        reset();
        setSaved(true);
        onSaved?.();
      } catch (err: any) {
        setError(err?.message ?? "");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="ios-field-label">{t("categories")}</div>
        <CategoryChips
          categories={sortedCategories}
          selected={selected}
          onToggle={toggle}
        />
        <div style={{ marginTop: 10 }}>
          <AddCategoryForm onCreated={onCreated} />
        </div>
      </div>

      {selected.size === 0 ? (
        <div style={{ fontSize: 14, color: "var(--label-tertiary)" }}>
          {t("selectCategory")}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sortedCategories
            .filter((c) => selected.has(c.id))
            .map((c) => {
              const tag = categoryTag(c, locale);
              const d = drafts[c.id] ?? { stars: null, comment: "" };
              return (
                <div
                  key={c.id}
                  className="ios-tile"
                  style={{ padding: "12px 14px" }}
                >
                  <div style={{ fontSize: 15, fontWeight: 500 }}>
                    {categoryName(c, locale)}
                    {tag && (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 400,
                          color: "var(--label-secondary)",
                          marginInlineStart: 8,
                        }}
                      >
                        {tag}
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <StarRating
                      value={d.stars}
                      onChange={(s) => setStars(c.id, s)}
                    />
                  </div>
                  <textarea
                    value={d.comment}
                    onChange={(e) => setComment(c.id, e.target.value)}
                    placeholder={t("whyPlaceholder")}
                    rows={2}
                    className="ios-textarea"
                    style={{ marginTop: 8 }}
                  />
                </div>
              );
            })}
        </div>
      )}

      {showLiveSummary && (
        <LiveCategorySummary
          categories={sortedCategories}
          selected={selected}
          drafts={drafts}
        />
      )}

      {error && (
        <div style={{ fontSize: 14, color: "var(--terracotta)" }}>{error}</div>
      )}
      {saved && (
        <div style={{ fontSize: 14, color: "var(--green)" }}>{t("saved")}</div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={pending || selected.size === 0}
          className="ios-btn"
        >
          {pending ? t("saving") : t("save")}
        </button>
      </div>
    </div>
  );
}
