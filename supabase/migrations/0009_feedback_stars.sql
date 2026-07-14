-- Feedback v3: 1–5 star rating replaces the verbal enum.
-- Add a nullable integer column with a range check; keep the old enum column
-- dormant (unused) for reversibility, mirroring how `notes` was left in place.
alter table public.feedback_ratings
  add column if not exists stars smallint
  check (stars is null or (stars between 1 and 5));

-- Migrate existing verbal ratings into stars (approximate mapping).
update public.feedback_ratings
  set stars = case rating
    when 'excellent' then 5
    when 'good'      then 4
    when 'fair'      then 3
    else null
  end
  where stars is null and rating is not null;

-- Collapse the two feedback hierarchies into one: everything becomes overall.
update public.feedback_entries
  set kind = 'overall', task_id = null
  where kind <> 'overall' or task_id is not null;

alter table public.feedback_entries alter column kind set default 'overall';
