import type { FeedbackCategoryRow } from "@/lib/database.types";

export type LocaleCode = "he" | "en";

// Feedback v3: ratings are 1–5 stars. Max star value.
export const STAR_MAX = 5;

export function categoryName(cat: FeedbackCategoryRow, locale: string): string {
  return locale === "he" ? cat.name_he || cat.name_en : cat.name_en || cat.name_he;
}

export function categoryTag(
  cat: FeedbackCategoryRow,
  locale: string
): string | null {
  return locale === "he" ? cat.tag_he ?? cat.tag_en : cat.tag_en ?? cat.tag_he;
}
