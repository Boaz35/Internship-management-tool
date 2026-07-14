-- Per-task resource links. Unlike task_template_links (attached to a shared
-- template task and matched to intern tasks by name), these hang directly off
-- a single intern's task row — so they also work for custom tasks, which have
-- no template. Mentors and team leaders manage them; interns can read them.
create table if not exists public.task_links (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  name       text not null,
  url        text not null,
  sequence   int  not null default 0,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index if not exists task_links_task_id_idx on public.task_links (task_id);

alter table public.task_links enable row level security;

-- Readable by anyone who can view the task's intern (intern, any designer, leader).
drop policy if exists task_links_select on public.task_links;
create policy task_links_select on public.task_links
  for select to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_links.task_id and public.can_view_intern(t.intern_id)
    )
  );

-- Writable by mentors (designers) + team leaders, mirroring the tasks policies.
drop policy if exists task_links_write on public.task_links;
create policy task_links_write on public.task_links
  for all to authenticated
  using (public.is_designer() or public.is_team_leader())
  with check (public.is_designer() or public.is_team_leader());
