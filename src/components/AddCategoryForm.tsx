"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { FeedbackCategoryRow } from "@/lib/database.types";
import { addFeedbackCategory } from "@/app/actions/feedback";

// Inline "+ New category" form. Creates a GLOBAL category (visible to everyone)
// and hands the new row back so the composer can auto-select it.
export function AddCategoryForm({
  onCreated,
}: {
  onCreated: (cat: FeedbackCategoryRow) => void;
}) {
  const t = useTranslations("feedback");
  const tc = useTranslations("common");
  const locale = useLocale() as "he" | "en";
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setName("");
    setTag("");
    setDescription("");
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const cat = await addFeedbackCategory({
          name,
          tag,
          description,
          locale,
        });
        if (cat) onCreated(cat as FeedbackCategoryRow);
        reset();
        setOpen(false);
      } catch (err: any) {
        setError(err?.message ?? tc("somethingWrong"));
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "var(--tint)",
          cursor: "pointer",
        }}
      >
        {t("addCategory")}
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="ios-tile flex flex-col gap-2"
      style={{ padding: "12px 14px" }}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("newCategoryName")}
        className="ios-input"
      />
      <input
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        placeholder={t("newCategoryTag")}
        className="ios-input"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t("newCategoryDescription")}
        rows={2}
        className="ios-textarea"
      />
      {error && (
        <div style={{ fontSize: 13, color: "var(--terracotta)" }}>{error}</div>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="ios-btn-ghost"
          style={{ height: 32, fontSize: 14 }}
        >
          {tc("cancel")}
        </button>
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="ios-btn"
          style={{ height: 32, fontSize: 14 }}
        >
          {t("create")}
        </button>
      </div>
    </form>
  );
}
