// Hand-written types matching the Supabase schema. If you later run
// `supabase gen types typescript`, you can replace this file with the output.

export type UserRole = "intern" | "designer" | "team_leader";
export type TaskSource = "template" | "custom";
export type HoursType = "work" | "vacation" | "sick";
export type FeedbackRating = "excellent" | "good" | "fair";
export type FeedbackKind = "task" | "overall";
export type FeedbackCategorySource = "predefined" | "custom";

export interface UserRow {
  id: string;
  google_id: string | null;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface MilestoneRow {
  id: string;
  name: string;
  sequence: number;
  description: string | null;
}

export interface TaskTemplateRow {
  id: string;
  milestone_id: string;
  name: string;
  sequence: number;
}

export interface TaskTemplateLinkRow {
  id: string;
  template_id: string;
  name: string;
  url: string;
  sequence: number;
  created_by: string | null;
  created_at: string;
}

export interface InternRow {
  id: string;
  user_id: string;
  allocated_designer_id: string | null;
  start_date: string;
  end_date: string | null;
  target_hours: number;
  created_at: string;
}

export interface TaskRow {
  id: string;
  intern_id: string;
  milestone_id: string;
  name: string;
  source: TaskSource;
  completed_by_intern: boolean;
  approved_by_designer: boolean;
  created_by: string | null;
  created_at: string;
}

export interface HoursLogRow {
  id: string;
  intern_id: string;
  date: string;
  hours: number;
  type: HoursType;
  created_at: string;
}

export interface NoteRow {
  id: string;
  intern_id: string;
  author_id: string | null;
  author_name: string | null;
  content: string;
  created_at: string;
}

export interface SummaryRow {
  id: string;
  intern_id: string;
  content: string;
  finalized: boolean;
  updated_by: string | null;
  updated_at: string;
}

export interface FeedbackCategoryRow {
  id: string;
  name_en: string;
  name_he: string;
  tag_en: string | null;
  tag_he: string | null;
  description_en: string | null;
  description_he: string | null;
  source: FeedbackCategorySource;
  sequence: number;
  active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface FeedbackEntryRow {
  id: string;
  intern_id: string;
  task_id: string | null;
  kind: FeedbackKind;
  author_id: string | null;
  author_name: string | null;
  context: string | null;
  created_at: string;
}

export interface FeedbackRatingRow {
  id: string;
  entry_id: string;
  category_id: string;
  rating: FeedbackRating | null;
  comment: string | null;
  created_at: string;
}

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      users: Table<UserRow>;
      milestones: Table<MilestoneRow>;
      task_templates: Table<TaskTemplateRow>;
      task_template_links: Table<TaskTemplateLinkRow>;
      interns: Table<InternRow>;
      tasks: Table<TaskRow>;
      hours_logs: Table<HoursLogRow>;
      notes: Table<NoteRow>;
      summaries: Table<SummaryRow>;
      feedback_categories: Table<FeedbackCategoryRow>;
      feedback_entries: Table<FeedbackEntryRow>;
      feedback_ratings: Table<FeedbackRatingRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      task_source: TaskSource;
      hours_type: HoursType;
      feedback_rating: FeedbackRating;
    };
    CompositeTypes: Record<string, never>;
  };
}
