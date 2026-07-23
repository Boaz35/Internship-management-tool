// Hand-written types matching the Supabase schema. If you later run
// `supabase gen types typescript`, you can replace this file with the output.

export type UserRole = "intern" | "designer" | "team_leader";
export type TaskSource = "template" | "custom";
export type HoursType = "work" | "vacation" | "sick";
export type AttachmentKind = "file" | "link";
export type FeedbackRating = "excellent" | "good" | "fair";
export type FeedbackKind = "task" | "overall";
export type FeedbackCategorySource = "predefined" | "custom";
export type NotificationType =
  | "task_added"
  | "link_added"
  | "task_completed"
  | "message";

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
  // null = global/template phase (all interns); set = phase for one intern.
  intern_id: string | null;
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

export interface TaskLinkRow {
  id: string;
  task_id: string;
  name: string;
  url: string;
  sequence: number;
  created_by: string | null;
  created_at: string;
}

export interface TaskAttachmentRow {
  id: string;
  task_id: string;
  // Owner tag: the intern this attachment belongs to. Enforced on insert by RLS.
  intern_id: string;
  kind: AttachmentKind;
  name: string;
  // Set when kind = 'link'.
  url: string | null;
  // Set when kind = 'file' — path within the private "task-attachments" bucket.
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
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
  // For source='template' tasks: the template task this was copied from (null
  // for custom tasks or legacy copies that couldn't be reconciled).
  template_id: string | null;
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
  // Dormant legacy verbal enum — no longer written or read. Superseded by `stars`.
  rating: FeedbackRating | null;
  stars: number | null;
  comment: string | null;
  created_at: string;
}

// Payload the client localises when rendering a notification.
export interface NotificationData {
  taskName?: string;
  linkName?: string;
  internName?: string;
}

export interface NotificationRow {
  id: string;
  // Recipient.
  user_id: string;
  type: NotificationType;
  actor_id: string | null;
  actor_name: string | null;
  data: NotificationData;
  // Free-text body for kind = 'message'.
  body: string | null;
  href: string | null;
  read: boolean;
  created_at: string;
}

export interface NotificationPrefRow {
  user_id: string;
  push_enabled: boolean;
  updated_at: string;
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
      task_links: Table<TaskLinkRow>;
      task_attachments: Table<TaskAttachmentRow>;
      hours_logs: Table<HoursLogRow>;
      notes: Table<NoteRow>;
      feedback_categories: Table<FeedbackCategoryRow>;
      feedback_entries: Table<FeedbackEntryRow>;
      feedback_ratings: Table<FeedbackRatingRow>;
      notifications: Table<NotificationRow>;
      notification_prefs: Table<NotificationPrefRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      task_source: TaskSource;
      hours_type: HoursType;
      attachment_kind: AttachmentKind;
      feedback_rating: FeedbackRating;
      notification_type: NotificationType;
    };
    CompositeTypes: Record<string, never>;
  };
}
