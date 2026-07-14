import type {
  FeedbackCategoryRow,
  FeedbackRating,
} from "@/lib/database.types";

export type LocaleCode = "he" | "en";

export function categoryName(cat: FeedbackCategoryRow, locale: string): string {
  return locale === "he" ? cat.name_he || cat.name_en : cat.name_en || cat.name_he;
}

export function categoryTag(
  cat: FeedbackCategoryRow,
  locale: string
): string | null {
  return locale === "he" ? cat.tag_he ?? cat.tag_en : cat.tag_en ?? cat.tag_he;
}

export const RATING_ORDER: FeedbackRating[] = ["excellent", "good", "fair"];

export function ratingColor(rating: FeedbackRating): {
  fg: string;
  bg: string;
} {
  switch (rating) {
    case "excellent":
      return { fg: "var(--rating-excellent)", bg: "var(--rating-excellent-bg)" };
    case "good":
      return { fg: "var(--rating-good)", bg: "var(--rating-good-bg)" };
    case "fair":
      return { fg: "var(--rating-fair)", bg: "var(--rating-fair-bg)" };
  }
}
