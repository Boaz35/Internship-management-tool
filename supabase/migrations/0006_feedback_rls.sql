-- Internship Management Tool — RLS for the feedback model.
-- Mirrors the (post-0004) notes rules: mentors (any designer) + team leaders
-- can read and author; interns can NEVER see feedback rows.
-- Reuses the SECURITY DEFINER helpers from 0002/0004:
--   public.is_designer(), public.is_team_leader().

alter table public.feedback_categories enable row level security;
alter table public.feedback_entries    enable row level security;
alter table public.feedback_ratings    enable row level security;

-- ---------------------------------------------------------------------------
-- Categories: mentor/leader can read and add (global, like the template editor).
-- ---------------------------------------------------------------------------
drop policy if exists fb_cat_select on public.feedback_categories;
create policy fb_cat_select on public.feedback_categories
  for select to authenticated using (public.is_designer() or public.is_team_leader());

drop policy if exists fb_cat_write on public.feedback_categories;
create policy fb_cat_write on public.feedback_categories
  for all to authenticated
  using (public.is_designer() or public.is_team_leader())
  with check (public.is_designer() or public.is_team_leader());

-- ---------------------------------------------------------------------------
-- Entries: private to mentors + leaders (interns excluded). Authors edit/delete
-- their own; team leaders manage all.
-- ---------------------------------------------------------------------------
drop policy if exists fb_entry_select on public.feedback_entries;
create policy fb_entry_select on public.feedback_entries
  for select to authenticated using (public.is_designer() or public.is_team_leader());

drop policy if exists fb_entry_insert on public.feedback_entries;
create policy fb_entry_insert on public.feedback_entries
  for insert to authenticated
  with check (author_id = auth.uid() and (public.is_designer() or public.is_team_leader()));

drop policy if exists fb_entry_update on public.feedback_entries;
create policy fb_entry_update on public.feedback_entries
  for update to authenticated
  using (author_id = auth.uid() or public.is_team_leader())
  with check (author_id = auth.uid() or public.is_team_leader());

drop policy if exists fb_entry_delete on public.feedback_entries;
create policy fb_entry_delete on public.feedback_entries
  for delete to authenticated
  using (author_id = auth.uid() or public.is_team_leader());

-- ---------------------------------------------------------------------------
-- Ratings: gated by the same mentor/leader check; author-scoped edits are
-- enforced additionally in the server actions.
-- ---------------------------------------------------------------------------
drop policy if exists fb_rating_select on public.feedback_ratings;
create policy fb_rating_select on public.feedback_ratings
  for select to authenticated using (public.is_designer() or public.is_team_leader());

drop policy if exists fb_rating_write on public.feedback_ratings;
create policy fb_rating_write on public.feedback_ratings
  for all to authenticated
  using (public.is_designer() or public.is_team_leader())
  with check (public.is_designer() or public.is_team_leader());
