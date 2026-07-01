-- Internship Management Tool — Row Level Security
-- Enforces the role model and the "notes are private per intern" rule.

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER helpers (avoid recursive RLS evaluation)
-- ---------------------------------------------------------------------------
create or replace function public.auth_role()
returns user_role
language sql stable security definer set search_path = public
as $$ select role from public.users where id = auth.uid() $$;

create or replace function public.is_team_leader()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce((select role = 'team_leader' from public.users where id = auth.uid()), false) $$;

create or replace function public.is_intern_owner(p_intern uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.interns i where i.id = p_intern and i.user_id = auth.uid()) $$;

create or replace function public.is_assigned_designer(p_intern uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.interns i where i.id = p_intern and i.allocated_designer_id = auth.uid()) $$;

create or replace function public.can_view_intern(p_intern uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select public.is_team_leader() or public.is_intern_owner(p_intern) or public.is_assigned_designer(p_intern) $$;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table public.users          enable row level security;
alter table public.milestones     enable row level security;
alter table public.task_templates enable row level security;
alter table public.interns        enable row level security;
alter table public.tasks          enable row level security;
alter table public.hours_logs     enable row level security;
alter table public.notes          enable row level security;
alter table public.summaries      enable row level security;

-- ---------------------------------------------------------------------------
-- users: org directory is readable by any signed-in user; only team leaders
-- change roles. Rows are created by the signup trigger (security definer).
-- ---------------------------------------------------------------------------
drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select to authenticated using (true);

drop policy if exists users_update_leader on public.users;
create policy users_update_leader on public.users
  for update to authenticated using (public.is_team_leader()) with check (public.is_team_leader());

drop policy if exists users_insert_leader on public.users;
create policy users_insert_leader on public.users
  for insert to authenticated with check (public.is_team_leader());

-- ---------------------------------------------------------------------------
-- milestones + task_templates: readable by all; writable by team leaders.
-- ---------------------------------------------------------------------------
drop policy if exists milestones_select on public.milestones;
create policy milestones_select on public.milestones
  for select to authenticated using (true);

drop policy if exists milestones_write on public.milestones;
create policy milestones_write on public.milestones
  for all to authenticated using (public.is_team_leader()) with check (public.is_team_leader());

drop policy if exists templates_select on public.task_templates;
create policy templates_select on public.task_templates
  for select to authenticated using (true);

drop policy if exists templates_write on public.task_templates;
create policy templates_write on public.task_templates
  for all to authenticated using (public.is_team_leader()) with check (public.is_team_leader());

-- ---------------------------------------------------------------------------
-- interns: visible to the intern, their designer, and team leaders.
-- Only team leaders create/edit (allocation, dates).
-- ---------------------------------------------------------------------------
drop policy if exists interns_select on public.interns;
create policy interns_select on public.interns
  for select to authenticated using (public.can_view_intern(id));

drop policy if exists interns_write on public.interns;
create policy interns_write on public.interns
  for all to authenticated using (public.is_team_leader()) with check (public.is_team_leader());

-- ---------------------------------------------------------------------------
-- tasks: visible to those who can view the intern.
-- Intern (own), assigned designer, team leader can update
-- (column-level rules — intern only completes, designer only approves —
-- are enforced in the server actions). Designers add custom tasks for their
-- own interns; team leaders manage all.
-- ---------------------------------------------------------------------------
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated using (public.can_view_intern(intern_id));

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update to authenticated
  using (public.is_intern_owner(intern_id) or public.is_assigned_designer(intern_id) or public.is_team_leader())
  with check (public.is_intern_owner(intern_id) or public.is_assigned_designer(intern_id) or public.is_team_leader());

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (public.is_assigned_designer(intern_id) or public.is_team_leader());

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
  for delete to authenticated
  using (public.is_assigned_designer(intern_id) or public.is_team_leader());

-- ---------------------------------------------------------------------------
-- hours_logs: visible to those who can view the intern; only the intern
-- (or a team leader) writes them.
-- ---------------------------------------------------------------------------
drop policy if exists hours_select on public.hours_logs;
create policy hours_select on public.hours_logs
  for select to authenticated using (public.can_view_intern(intern_id));

drop policy if exists hours_write on public.hours_logs;
create policy hours_write on public.hours_logs
  for all to authenticated
  using (public.is_intern_owner(intern_id) or public.is_team_leader())
  with check (public.is_intern_owner(intern_id) or public.is_team_leader());

-- ---------------------------------------------------------------------------
-- notes: PRIVATE. Only the assigned designer and team leaders can read.
-- The intern themself cannot see notes. Authors edit/delete their own notes.
-- ---------------------------------------------------------------------------
drop policy if exists notes_select on public.notes;
create policy notes_select on public.notes
  for select to authenticated
  using (public.is_assigned_designer(intern_id) or public.is_team_leader());

drop policy if exists notes_insert on public.notes;
create policy notes_insert on public.notes
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (public.is_assigned_designer(intern_id) or public.is_team_leader())
  );

drop policy if exists notes_update on public.notes;
create policy notes_update on public.notes
  for update to authenticated
  using (author_id = auth.uid() or public.is_team_leader())
  with check (author_id = auth.uid() or public.is_team_leader());

drop policy if exists notes_delete on public.notes;
create policy notes_delete on public.notes
  for delete to authenticated
  using (author_id = auth.uid() or public.is_team_leader());

-- ---------------------------------------------------------------------------
-- summaries: readable by designer + team leader (mirrors notes — contains
-- private notes). Editable by assigned designer and team leaders.
-- ---------------------------------------------------------------------------
drop policy if exists summaries_select on public.summaries;
create policy summaries_select on public.summaries
  for select to authenticated
  using (public.is_assigned_designer(intern_id) or public.is_team_leader());

drop policy if exists summaries_write on public.summaries;
create policy summaries_write on public.summaries
  for all to authenticated
  using (public.is_assigned_designer(intern_id) or public.is_team_leader())
  with check (public.is_assigned_designer(intern_id) or public.is_team_leader());
