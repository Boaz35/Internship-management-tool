"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type {
  FeedbackCategoryRow,
  FeedbackKind,
  FeedbackRating,
} from "@/lib/database.types";
import { categoryName, categoryTag } from "@/lib/feedback";
import { createFeedbackEntry } from "@/app/actions/feedback";
import { CategoryChips } from "@/components/CategoryChips";
import { AddCategoryForm } from "@/components/AddCategoryForm";
import { VerbalRating } from "@/components/VerbalRating";
import {
  LiveCategorySummary,
  type DraftRating,
} from "@/components/LiveCategorySummary";

// Shared composer for both task-specific and overall feedback.
export function FeedbackComposer({
  internId,
  taskId = null,
  kind,
  categories: initialCategories,
  onSaved,
  showLiveSummary = false,
}: {
  internId: string;
  taskId?: string | null;
  kind: FeedbackKind;
  categories: FeedbackCategoryRow[];
  onSaved?: () => void;
  showLiveSummary?: boolean;
}) {
  const t = useTranslations("feedback");
  const locale = useLocale();

  const [categories, setCategories] = useState(initialCategories);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, DraftRating>>({});
  const [context, setContext] = useState("");
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
          d[id] ? d : { ...d, [id]: { rating: null, comment: "" } }
        );
      }
      return next;
    });
  }

  function setRating(id: string, rating: FeedbackRating | null) {
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? { comment: "" }), rating } }));
  }
  function setComment(id: string, comment: string) {
    setDrafts((d) => ({
      ...d,
      [id]: { ...(d[id] ?? { rating: null }), comment },
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
    setContext("");
  }

  function save() {
    setError(null);
    const ratings = Array.from(selected).map((categoryId) => ({
      categoryId,
      rating: drafts[categoryId]?.rating ?? null,
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
          taskId,
          kind,
          context: context || null,
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
        <label className="ios-field-label">{t("context")}</label>
        <input
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder={t("contextPlaceholder")}
          className="ios-input"
          style={{ width: "100%" }}
        />
      </div>

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
              const d = drafts[c.id] ?? { rating: null, comment: "" };
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
                    <VerbalRating
                      value={d.rating}
                      onChange={(r) => setRating(c.id, r)}
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
