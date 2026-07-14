-- Per-intern phases: a milestone (phase) may optionally belong to a single
-- intern. NULL intern_id = a global/template phase shared by every intern
-- (the original behaviour). A non-null intern_id scopes the phase — and its
-- tasks (cascade) — to that one intern only.
alter table public.milestones
  add column if not exists intern_id uuid
  references public.interns(id) on delete cascade;

create index if not exists milestones_intern_id_idx
  on public.milestones (intern_id);
