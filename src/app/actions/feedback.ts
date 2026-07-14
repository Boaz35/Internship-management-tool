"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

// Any mentor (designer) or team leader may author feedback on any intern.
async function assertCanMentor(internId: string) {
  const user = await requireUser();
  const supabase = createClient();
  const { data: intern } = await supabase
    .from("interns")
    .select("id")
    .eq("id", internId)
    .single();
  const allowed = user.role === "team_leader" || user.role === "designer";
  if (!intern || !allowed) throw new Error("Not allowed for this intern.");
  return user;
}

function revalidateInternRoutes(internId: string) {
  revalidatePath(`/designer/intern/${internId}`);
  revalidatePath(`/leader/intern/${internId}`);
}

export interface RatingInput {
  categoryId: string;
  stars: number | null;
  comment: string | null;
}

// Create one overall feedback entry + one rating row per addressed category.
// Feedback v3: there is only one kind of feedback — overall, per intern.
export async function createFeedbackEntry(input: {
  internId: string;
  context: string | null;
  ratings: RatingInput[];
}) {
  const user = await assertCanMentor(input.internId);
  const supabase = createClient();

  const cleanRatings = input.ratings.filter(
    (r) => r.categoryId && (r.stars != null || (r.comment && r.comment.trim()))
  );
  if (cleanRatings.length === 0) {
    throw new Error("Add a rating or comment to at least one category.");
  }

  const { data: entry, error: entryErr } = await supabase
    .from("feedback_entries")
    .insert({
      intern_id: input.internId,
      task_id: null,
      kind: "overall",
      author_id: user.id,
      author_name: user.full_name ?? user.email,
      context: input.context?.trim() || null,
    })
    .select("id")
    .single();
  if (entryErr || !entry) throw new Error(entryErr?.message ?? "Could not save feedback.");

  const rows = cleanRatings.map((r) => ({
    entry_id: entry.id,
    category_id: r.categoryId,
    stars: r.stars,
    comment: r.comment?.trim() || null,
  }));
  const { error: ratingErr } = await supabase.from("feedback_ratings").insert(rows);
  if (ratingErr) {
    // Roll back the orphan entry so we never leave a header with no body.
    await supabase.from("feedback_entries").delete().eq("id", entry.id);
    throw new Error(ratingErr.message);
  }

  revalidateInternRoutes(input.internId);
  return entry.id;
}

// Author (or team leader) may delete an entry. RLS enforces this too.
export async function deleteFeedbackEntry(entryId: string, internId: string) {
  const user = await assertCanMentor(internId);
  const supabase = createClient();

  if (user.role !== "team_leader") {
    const { data: entry } = await supabase
      .from("feedback_entries")
      .select("author_id")
      .eq("id", entryId)
      .single();
    if (entry && entry.author_id && entry.author_id !== user.id) {
      throw new Error("Only the author or a team leader can delete this.");
    }
  }

  const { error } = await supabase
    .from("feedback_entries")
    .delete()
    .eq("id", entryId);
  if (error) throw new Error(error.message);
  revalidateInternRoutes(internId);
}

// Replace an entry's context + rating rows (author or team leader only).
export async function updateFeedbackEntry(input: {
  entryId: string;
  internId: string;
  context: string | null;
  ratings: RatingInput[];
}) {
  const user = await assertCanMentor(input.internId);
  const supabase = createClient();

  const { data: entry } = await supabase
    .from("feedback_entries")
    .select("author_id")
    .eq("id", input.entryId)
    .single();
  if (!entry) throw new Error("Feedback entry not found.");
  if (
    user.role !== "team_leader" &&
    entry.author_id &&
    entry.author_id !== user.id
  ) {
    throw new Error("Only the author or a team leader can edit this.");
  }

  const { error: ctxErr } = await supabase
    .from("feedback_entries")
    .update({ context: input.context?.trim() || null })
    .eq("id", input.entryId);
  if (ctxErr) throw new Error(ctxErr.message);

  await supabase.from("feedback_ratings").delete().eq("entry_id", input.entryId);
  const cleanRatings = input.ratings.filter(
    (r) => r.categoryId && (r.stars != null || (r.comment && r.comment.trim()))
  );
  if (cleanRatings.length > 0) {
    const rows = cleanRatings.map((r) => ({
      entry_id: input.entryId,
      category_id: r.categoryId,
      stars: r.stars,
      comment: r.comment?.trim() || null,
    }));
    const { error } = await supabase.from("feedback_ratings").insert(rows);
    if (error) throw new Error(error.message);
  }

  revalidateInternRoutes(input.internId);
}

// Create a GLOBAL category. Fills the active-locale columns and copies them
// into the other language as a fallback (editable later).
export async function addFeedbackCategory(input: {
  name: string;
  tag?: string | null;
  description?: string | null;
  locale: "he" | "en";
}) {
  const user = await requireUser();
  const allowed = user.role === "team_leader" || user.role === "designer";
  if (!allowed) throw new Error("Not allowed.");
  const name = input.name.trim();
  if (!name) throw new Error("Category name is required.");

  const tag = input.tag?.trim() || null;
  const description = input.description?.trim() || null;

  const row =
    input.locale === "he"
      ? {
          name_he: name,
          name_en: name,
          tag_he: tag,
          tag_en: tag,
          description_he: description,
          description_en: description,
        }
      : {
          name_en: name,
          name_he: name,
          tag_en: tag,
          tag_he: tag,
          description_en: description,
          description_he: description,
        };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("feedback_categories")
    .insert({ ...row, source: "custom", sequence: 100, created_by: user.id })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}
