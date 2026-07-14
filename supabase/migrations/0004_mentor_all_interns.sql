-- Internship Management Tool — broaden mentor (designer) access
-- Previously a designer could only see/edit their *allocated* interns.
-- New rule: every mentor (role = 'designer') has full view + edit access to
-- ALL interns, tasks, notes, and summaries — the same reach team leaders have,
-- minus org/role administration.

-- ---------------------------------------------------------------------------
-- Helper: is the current user a mentor (designer)?  Any designer, not just the
-- one allocated to a given intern.
-- ---------------------------------------------------------------------------
create or replace function public.is_designer()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce((select role = 'designer' from public.users where id = auth.uid()), false) $$;

-- ---------------------------------------------------------------------------
-- can_view_intern: any designer can now view any intern.
-- (is_assigned_designer is retained for backward compat / potential future use.)
-- ---------------------------------------------------------------------------
create or replace function public.can_view_intern(p_intern uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select public.is_team_leader() or public.is_designer() or public.is_intern_owner(p_intern) $$;

-- ---------------------------------------------------------------------------
-- tasks: any designer may update / insert / delete for any intern.
-- ---------------------------------------------------------------------------
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update to authenticated
  using (public.is_intern_owner(intern_id) or public.is_designer() or public.is_team_leader())
  with check (public.is_intern_owner(intern_id) or public.is_designer() or public.is_team_leader());

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (public.is_designer() or public.is_team_leader());

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
  for delete to authenticated
  using (public.is_designer() or public.is_team_leader());

-- ---------------------------------------------------------------------------
-- notes: any designer may read and author notes on any intern.
-- (Authors still edit/delete their own notes; team leaders manage all.)
-- ---------------------------------------------------------------------------
drop policy if exists notes_select on public.notes;
create policy notes_select on public.notes
  for select to authenticated
  using (public.is_designer() or public.is_team_leader());

drop policy if exists notes_insert on public.notes;
create policy notes_insert on public.notes
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (public.is_designer() or public.is_team_leader())
  );

-- ---------------------------------------------------------------------------
-- summaries: any designer may read and edit any intern's summary.
-- ---------------------------------------------------------------------------
drop policy if exists summaries_select on public.summaries;
create policy summaries_select on public.summaries
  for select to authenticated
  using (public.is_designer() or public.is_team_leader());

drop policy if exists summaries_write on public.summaries;
create policy summaries_write on public.summaries
  for all to authenticated
  using (public.is_designer() or public.is_team_leader())
  with check (public.is_designer() or public.is_team_leader());
