"use client";

import { useLocale } from "next-intl";
import type { FeedbackCategoryRow } from "@/lib/database.types";
import { categoryName, categoryTag } from "@/lib/feedback";

// Toggleable category chips. Label = locale name; tag shown as a subtle
// sub-label. Selecting a chip reveals that category's input block upstream.
export function CategoryChips({
  categories,
  selected,
  onToggle,
}: {
  categories: FeedbackCategoryRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const locale = useLocale();

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const active = selected.has(cat.id);
        const tag = categoryTag(cat, locale);
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onToggle(cat.id)}
            aria-pressed={active}
            style={{
              textAlign: "start",
              cursor: "pointer",
              borderRadius: 16,
              padding: "8px 12px",
              lineHeight: 1.25,
              background: active ? "var(--tint)" : "var(--fill-tertiary)",
              color: "#000",
              border: active
                ? "1px solid var(--tint)"
                : "1px solid transparent",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 500 }}>
              {categoryName(cat, locale)}
            </div>
            {tag && (
              <div
                style={{
                  fontSize: 11,
                  color: active ? "rgba(0,0,0,0.6)" : "var(--label-secondary)",
                  marginTop: 1,
                }}
              >
                {tag}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
