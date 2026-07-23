-- Intern-owned task attachments: files (uploaded to Supabase Storage) and links.
--
-- Unlike task_links (mentor-managed, readable by everyone who can view the
-- intern), these are submitted BY THE INTERN for their own task. Every row is
-- tagged with intern_id and the RLS below enforces:
--   * an intern sees/inserts only their OWN attachments;
--   * other interns can't see them at all (they can't view another intern);
--   * mentors (designers) and team leaders see ALL interns' attachments and may
--     delete them.
-- can_view_intern(intern_id) already resolves to "owner OR any designer OR team
-- leader" (see 0002_rls.sql / 0004_mentor_all_interns.sql), so reads reuse it.

do $$ begin
  create type attachment_kind as enum ('file', 'link');
exception when duplicate_object then null; end $$;

create table if not exists public.task_attachments (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks(id) on delete cascade,
  -- Denormalised owner tag. Enforced against the current user on insert (RLS)
  -- and kept in sync with the task by the server action.
  intern_id    uuid not null references public.interns(id) on delete cascade,
  kind         attachment_kind not null,
  name         text not null,               -- display label / original filename
  url          text,                        -- set when kind = 'link'
  storage_path text,                         -- set when kind = 'file' (path in bucket)
  mime_type    text,
  size_bytes   bigint,
  created_by   uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint task_attachments_shape check (
    (kind = 'link' and url is not null)
    or (kind = 'file' and storage_path is not null)
  )
);

create index if not exists task_attachments_task_idx   on public.task_attachments (task_id);
create index if not exists task_attachments_intern_idx on public.task_attachments (intern_id);

alter table public.task_attachments enable row level security;

-- Readable by the owning intern, any mentor, and team leaders.
drop policy if exists task_attachments_select on public.task_attachments;
create policy task_attachments_select on public.task_attachments
  for select to authenticated
  using (public.can_view_intern(intern_id));

-- Only the owning intern may add attachments, and only tagged with their own id.
drop policy if exists task_attachments_insert on public.task_attachments;
create policy task_attachments_insert on public.task_attachments
  for insert to authenticated
  with check (
    public.is_intern_owner(intern_id)
    and created_by = auth.uid()
  );

-- Deletable by the owning intern, any mentor, and team leaders.
drop policy if exists task_attachments_delete on public.task_attachments;
create policy task_attachments_delete on public.task_attachments
  for delete to authenticated
  using (public.can_view_intern(intern_id));

-- ---------------------------------------------------------------------------
-- Storage: a private bucket for the uploaded files.
-- Path convention (set by the server action): {intern_id}/{task_id}/{uuid}-{filename}
-- The first path segment is the intern_id, which the policies below use to
-- decide access -- mirroring the table's rules.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('task-attachments', 'task-attachments', false, 26214400) -- 25 MB
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

-- Read: owning intern + mentors + team leaders.
drop policy if exists task_attachments_obj_select on storage.objects;
create policy task_attachments_obj_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'task-attachments'
    and public.can_view_intern(((storage.foldername(name))[1])::uuid)
  );

-- Upload: only the owning intern, into their own {intern_id}/ prefix.
drop policy if exists task_attachments_obj_insert on storage.objects;
create policy task_attachments_obj_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'task-attachments'
    and public.is_intern_owner(((storage.foldername(name))[1])::uuid)
  );

-- Delete: owning intern + mentors + team leaders (matches table delete rule).
drop policy if exists task_attachments_obj_delete on storage.objects;
create policy task_attachments_obj_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'task-attachments'
    and public.can_view_intern(((storage.foldername(name))[1])::uuid)
  );
