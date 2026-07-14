-- Internship Management Tool — named URLs (resources) per template task.
-- Team leaders and mentors (designers) can attach named links to any
-- program-template task; everyone who can read the template can read them.

create table if not exists public.task_template_links (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.task_templates(id) on delete cascade,
  name        text not null,
  url         text not null,
  sequence    int  not null default 100,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_ttl_template on public.task_template_links(template_id);

alter table public.task_template_links enable row level security;

-- Readable by any authenticated user (mirrors task_templates_select).
drop policy if exists ttl_select on public.task_template_links;
create policy ttl_select on public.task_template_links
  for select to authenticated using (true);

-- Writable by team leaders + mentors (designers), like the template itself.
drop policy if exists ttl_write on public.task_template_links;
create policy ttl_write on public.task_template_links
  for all to authenticated
  using (public.is_team_leader() or public.auth_role() = 'designer')
  with check (public.is_team_leader() or public.auth_role() = 'designer');
