"use server";

import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { categoryName } from "@/lib/feedback";
import { summarizeHours, formatDate } from "@/lib/progress";
import type {
  FeedbackCategoryRow,
  FeedbackEntryRow,
  FeedbackRatingRow,
  HoursLogRow,
  InternRow,
  MilestoneRow,
  TaskRow,
  UserRow,
} from "@/lib/database.types";

async function assertCanAccess(internId: string) {
  const user = await requireUser();
  // Any mentor (designer) or team leader can access any intern's summary.
  if (user.role === "team_leader" || user.role === "designer") return user;
  throw new Error("Not allowed.");
}

// Build a first-draft summary from the intern's data and store it.
export async function generateSummary(internId: string) {
  await assertCanAccess(internId);
  const supabase = createClient();

  const { data: intern } = await supabase
    .from("interns")
    .select("*")
    .eq("id", internId)
    .single<InternRow>();
  if (!intern) throw new Error("Intern not found.");

  const [
    { data: person },
    { data: milestones },
    { data: tasks },
    { data: logs },
    { data: categories },
    { data: entries },
  ] = await Promise.all([
    supabase.from("users").select("*").eq("id", intern.user_id).single<UserRow>(),
    supabase.from("milestones").select("*").order("sequence"),
    supabase.from("tasks").select("*").eq("intern_id", internId),
    supabase.from("hours_logs").select("*").eq("intern_id", internId),
    supabase
      .from("feedback_categories")
      .select("*")
      .order("sequence"),
    supabase
      .from("feedback_entries")
      .select("*")
      .eq("intern_id", internId)
      .order("created_at"),
  ]);

  const entryRows = (entries as FeedbackEntryRow[]) ?? [];
  let ratings: FeedbackRatingRow[] = [];
  if (entryRows.length > 0) {
    const { data: r } = await supabase
      .from("feedback_ratings")
      .select("*")
      .in(
        "entry_id",
        entryRows.map((e) => e.id)
      );
    ratings = (r as FeedbackRatingRow[]) ?? [];
  }

  const t = await getTranslations("summary");
  const tf = await getTranslations("feedback");
  const locale = await getLocale();

  const content = buildSummary({
    person: person as UserRow | null,
    intern,
    milestones: (milestones as MilestoneRow[]) ?? [],
    tasks: (tasks as TaskRow[]) ?? [],
    logs: (logs as HoursLogRow[]) ?? [],
    categories: (categories as FeedbackCategoryRow[]) ?? [],
    entries: entryRows,
    ratings,
    t,
    locale,
    ratingLabel: {
      excellent: tf("ratingExcellent"),
      good: tf("ratingGood"),
      fair: tf("ratingFair"),
    },
    overallSource: tf("overallSource"),
  });

  const { error } = await supabase
    .from("summaries")
    .upsert({ intern_id: internId, content }, { onConflict: "intern_id" });
  if (error) throw new Error(error.message);

  revalidatePath(`/summary/${internId}`);
  return content;
}

export async function saveSummary(internId: string, content: string) {
  const user = await assertCanAccess(internId);
  const supabase = createClient();
  const { error } = await supabase
    .from("summaries")
    .upsert(
      { intern_id: internId, content, updated_by: user.id },
      { onConflict: "intern_id" }
    );
  if (error) throw new Error(error.message);
  revalidatePath(`/summary/${internId}`);
}

export async function finalizeSummary(internId: string, finalized: boolean) {
  await assertCanAccess(internId);
  const supabase = createClient();
  const { error } = await supabase
    .from("summaries")
    .update({ finalized })
    .eq("intern_id", internId);
  if (error) throw new Error(error.message);
  revalidatePath(`/summary/${internId}`);
}

type Translator = (key: string, values?: Record<string, string | number>) => string;

// The mentor section is driven by structured feedback, grouped by category,
// replacing the old free-form notes. Headings + rating labels are localised
// to the active UI language (Hebrew or English).
function buildSummary(data: {
  person: UserRow | null;
  intern: InternRow;
  milestones: MilestoneRow[];
  tasks: TaskRow[];
  logs: HoursLogRow[];
  categories: FeedbackCategoryRow[];
  entries: FeedbackEntryRow[];
  ratings: FeedbackRatingRow[];
  t: Translator;
  locale: string;
  ratingLabel: Record<string, string>;
  overallSource: string;
}): string {
  const {
    person,
    intern,
    milestones,
    tasks,
    logs,
    categories,
    entries,
    ratings,
    t,
    locale,
    ratingLabel,
    overallSource,
  } = data;
  const name = person?.full_name ?? person?.email ?? "Intern";
  const hours = summarizeHours(logs, intern.target_hours);

  const catById = new Map(categories.map((c) => [c.id, c]));
  const entryById = new Map(entries.map((e) => [e.id, e]));
  const taskNameById = new Map(tasks.map((tk) => [tk.id, tk.name]));

  const lines: string[] = [];
  lines.push(`# ${t("heading", { name })}`);
  lines.push("");
  lines.push(
    `**${t("period")}:** ${formatDate(intern.start_date, locale)} – ${formatDate(intern.end_date, locale)}`
  );
  lines.push(
    `**${t("hours")}:** ${t("hoursWorked", { worked: hours.worked, target: hours.target })}` +
      (hours.vacation + hours.sick > 0
        ? ` (${hours.vacation}h / ${hours.sick}h)`
        : "")
  );
  lines.push("");

  lines.push(`## ${t("milestones")}`);
  for (const m of milestones) {
    const mt = tasks.filter((tk) => tk.milestone_id === m.id);
    const approved = mt.filter((tk) => tk.approved_by_designer);
    lines.push("");
    lines.push(
      `### ${m.name} — ${t("milestoneProgress", { approved: approved.length, total: mt.length })}`
    );
    for (const tk of mt) {
      lines.push(`- [${tk.approved_by_designer ? "x" : " "}] ${tk.name}`);
    }
  }
  lines.push("");

  // Mentor feedback — grouped by category (across task + overall feedback).
  lines.push(`## ${t("mentorFeedback")}`);
  if (ratings.length === 0) {
    lines.push(`_${t("noFeedback")}_`);
  } else {
    const byCat = new Map<string, FeedbackRatingRow[]>();
    for (const r of ratings) {
      const list = byCat.get(r.category_id) ?? [];
      list.push(r);
      byCat.set(r.category_id, list);
    }
    for (const cat of categories) {
      const rs = byCat.get(cat.id);
      if (!rs || rs.length === 0) continue;
      lines.push("");
      lines.push(`### ${categoryName(cat, locale)}`);
      for (const r of rs) {
        const entry = entryById.get(r.entry_id);
        const source = entry?.task_id
          ? taskNameById.get(entry.task_id) ?? overallSource
          : overallSource;
        const date = entry ? formatDate(entry.created_at, locale) : "";
        const rating = r.rating ? `**${ratingLabel[r.rating]}**` : "";
        const comment = r.comment ?? "";
        const parts = [rating, comment].filter(Boolean).join(" — ");
        lines.push(`- ${source} (${date}): ${parts || "—"}`);
      }
    }
  }
  lines.push("");

  // Overall feedback — the kind='overall' entries as a narrative subsection.
  const overallEntries = entries.filter((e) => e.kind === "overall");
  if (overallEntries.length > 0) {
    lines.push(`### ${t("overallFeedback")}`);
    for (const e of overallEntries) {
      const author = e.author_name ?? "";
      const date = formatDate(e.created_at, locale);
      if (e.context) {
        lines.push(`- ${date}${author ? ` — ${author}` : ""}: ${e.context}`);
      }
      const rs = ratings.filter((r) => r.entry_id === e.id);
      for (const r of rs) {
        const cat = catById.get(r.category_id);
        const label = cat ? categoryName(cat, locale) : "—";
        const rating = r.rating ? `**${ratingLabel[r.rating]}**` : "";
        const comment = r.comment ?? "";
        const parts = [rating, comment].filter(Boolean).join(" — ");
        lines.push(`  - ${label}: ${parts || "—"}`);
      }
    }
    lines.push("");
  }

  lines.push(`## ${t("closingRemarks")}`);
  lines.push("");
  lines.push(`_${t("closingPlaceholder")}_`);

  return lines.join("\n");
}
