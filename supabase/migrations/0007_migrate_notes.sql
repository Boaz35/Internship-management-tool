-- Internship Management Tool — one-off migration of existing private notes
-- into `overall` feedback entries. Each note becomes a kind='overall' entry
-- with task_id = NULL and its text preserved as the entry's `context`.
-- No ratings are created. The `notes` table is left in place (dormant) and can
-- be dropped in a later cleanup migration once this is verified in production.
--
-- Idempotent: a marker keeps notes from being migrated twice if this runs again.

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'notes'
  ) then
    insert into public.feedback_entries
      (intern_id, task_id, kind, author_id, author_name, context, created_at)
    select
      n.intern_id, null, 'overall', n.author_id, n.author_name, n.content, n.created_at
    from public.notes n
    where not exists (
      -- avoid duplicating a note already migrated (same intern + text + timestamp)
      select 1 from public.feedback_entries fe
      where fe.intern_id = n.intern_id
        and fe.kind = 'overall'
        and fe.context is not distinct from n.content
        and fe.created_at = n.created_at
    );
  end if;
end $$;
