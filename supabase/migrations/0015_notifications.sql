-- Notification center: a per-user feed of events (task added, resource link
-- attached, task completed) plus free-text messages between users.
--
-- Rows are always written server-side with the service-role client, because
-- the actor inserts a row owned by ANOTHER user (a mentor's action notifies an
-- intern, an intern's completion notifies a mentor, etc.). There is therefore
-- deliberately NO insert policy below — direct client inserts are denied, so a
-- user can't forge notifications; they can only read and mark their own read.

do $$ begin
  create type notification_type as enum
    ('task_added', 'link_added', 'task_completed', 'message');
exception when duplicate_object then null; end $$;

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  -- Recipient. The row is scoped to (and readable only by) this user.
  user_id    uuid not null references public.users(id) on delete cascade,
  type       notification_type not null,
  -- Who triggered it (null for system events / deleted users). actor_name is
  -- denormalised so the client can render "message from X" without a join.
  actor_id   uuid references public.users(id) on delete set null,
  actor_name text,
  -- Small payload the client localises: { taskName, linkName, internName }.
  data       jsonb not null default '{}'::jsonb,
  -- Free-text body for 'message' notifications.
  body       text,
  -- Deep link opened when the notification is clicked (e.g. /intern).
  href       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Read only your own notifications.
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

-- Mark your own read (only your own rows, and can't reassign them).
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Dismiss (delete) your own notifications.
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Per-user push preference. A dedicated table (rather than a users column) so
-- users can self-manage it: the users table's update policy is team-leader-only
-- and RLS can't be column-scoped, so a self-editable users row would expose the
-- role column. This table is safely self-owned.
-- ---------------------------------------------------------------------------
create table if not exists public.notification_prefs (
  user_id      uuid primary key references public.users(id) on delete cascade,
  push_enabled boolean not null default true,
  updated_at   timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

drop policy if exists notification_prefs_rw on public.notification_prefs;
create policy notification_prefs_rw on public.notification_prefs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Live delivery. The browser subscribes to inserts on notifications; RLS still
-- governs which rows each subscriber actually receives, so a user only ever
-- sees their own. (Guarded so re-running the migration doesn't error.)
-- ---------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when undefined_object then null; -- publication doesn't exist in this env
end $$;
