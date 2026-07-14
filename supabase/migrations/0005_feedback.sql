-- Internship Management Tool — structured mentor feedback (v2)
-- Replaces the free-form `notes` feature with a category-based feedback model.
-- Two hierarchies share one shape:
--   * task-specific feedback  (feedback_entries.task_id = a real tasks row)
--   * overall intern feedback (feedback_entries.task_id = NULL)
-- Each entry addresses one or more categories, each optionally rated + commented.

-- ---------------------------------------------------------------------------
-- Verbal rating enum (ordered best -> least). Nullable on the rating row —
-- a category can be commented without a verbal grade. No numeric scores.
-- ---------------------------------------------------------------------------
do $$ begin
  create type feedback_rating as enum ('excellent', 'good', 'fair');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- feedback_categories — shared, bilingual taxonomy.
-- Addable by any designer / team leader; immediately available to everyone.
-- ---------------------------------------------------------------------------
create table if not exists public.feedback_categories (
  id             uuid primary key default gen_random_uuid(),
  name_en        text not null,
  name_he        text not null,
  tag_en         text,
  tag_he         text,
  description_en text,
  description_he text,
  source         text not null default 'custom',  -- 'predefined' | 'custom'
  sequence       int  not null default 100,
  active         boolean not null default true,
  created_by     uuid references public.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

-- Idempotency for the predefined seed (see seed.sql).
create unique index if not exists idx_fb_categories_name_en
  on public.feedback_categories(name_en);

-- ---------------------------------------------------------------------------
-- feedback_entries — one feedback event (task-specific or overall).
-- ---------------------------------------------------------------------------
create table if not exists public.feedback_entries (
  id          uuid primary key default gen_random_uuid(),
  intern_id   uuid not null references public.interns(id) on delete cascade,
  task_id     uuid references public.tasks(id) on delete set null,  -- NULL = overall
  kind        text not null default 'task',  -- 'task' | 'overall'
  author_id   uuid references public.users(id) on delete set null,
  author_name text,
  context     text,           -- optional free-text ("what this feedback is about")
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- feedback_ratings — one row per category addressed in an entry.
-- ---------------------------------------------------------------------------
create table if not exists public.feedback_ratings (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references public.feedback_entries(id) on delete cascade,
  category_id uuid not null references public.feedback_categories(id) on delete cascade,
  rating      feedback_rating,   -- nullable (optional verbal grade)
  comment     text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_fb_entries_intern on public.feedback_entries(intern_id);
create index if not exists idx_fb_entries_task   on public.feedback_entries(task_id);
create index if not exists idx_fb_ratings_entry  on public.feedback_ratings(entry_id);
create index if not exists idx_fb_ratings_cat    on public.feedback_ratings(category_id);
