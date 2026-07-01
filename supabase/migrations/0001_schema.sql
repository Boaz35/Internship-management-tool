-- Internship Management Tool — core schema
-- Run against your Supabase project (SQL editor or `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('intern', 'designer', 'team_leader');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_source as enum ('template', 'custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type hours_type as enum ('work', 'vacation', 'sick');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- users  (1:1 with auth.users; id IS the auth uid)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  google_id  text,
  email      text not null unique,
  full_name  text,
  role       user_role not null default 'intern',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- milestones  (shared template, same set for everyone)
-- ---------------------------------------------------------------------------
create table if not exists public.milestones (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sequence    int  not null,
  description text
);

-- ---------------------------------------------------------------------------
-- task_templates  (admin-managed default tasks per milestone)
-- ---------------------------------------------------------------------------
create table if not exists public.task_templates (
  id           uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  name         text not null,
  sequence     int  not null
);

-- ---------------------------------------------------------------------------
-- interns
-- ---------------------------------------------------------------------------
create table if not exists public.interns (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique references public.users(id) on delete cascade,
  allocated_designer_id uuid references public.users(id) on delete set null,
  start_date            date not null,
  end_date              date,
  target_hours          int not null default 186,
  created_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tasks  (per-intern rows, instantiated from template or custom)
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id                  uuid primary key default gen_random_uuid(),
  intern_id           uuid not null references public.interns(id) on delete cascade,
  milestone_id        uuid not null references public.milestones(id) on delete cascade,
  name                text not null,
  source              task_source not null default 'template',
  completed_by_intern boolean not null default false,
  approved_by_designer boolean not null default false,
  created_by          uuid references public.users(id) on delete set null,
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- hours_logs
-- ---------------------------------------------------------------------------
create table if not exists public.hours_logs (
  id         uuid primary key default gen_random_uuid(),
  intern_id  uuid not null references public.interns(id) on delete cascade,
  date       date not null,
  hours      numeric(4,1) not null default 0,
  type       hours_type not null default 'work',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- notes  (private per intern; feeds the summary)
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  intern_id   uuid not null references public.interns(id) on delete cascade,
  author_id   uuid references public.users(id) on delete set null,
  author_name text,
  content     text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- summaries  (editable end-of-internship document, one per intern)
-- ---------------------------------------------------------------------------
create table if not exists public.summaries (
  id         uuid primary key default gen_random_uuid(),
  intern_id  uuid not null unique references public.interns(id) on delete cascade,
  content    text not null default '',
  finalized  boolean not null default false,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_tasks_intern on public.tasks(intern_id);
create index if not exists idx_hours_intern on public.hours_logs(intern_id);
create index if not exists idx_notes_intern on public.notes(intern_id);
create index if not exists idx_interns_designer on public.interns(allocated_designer_id);

-- ---------------------------------------------------------------------------
-- Auto-provision a public.users row when someone signs up via auth.
-- Default role is 'intern'; a team leader promotes users afterwards.
-- (The first team leader must be promoted manually — see README.)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, google_id, email, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'sub',
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    'intern'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
