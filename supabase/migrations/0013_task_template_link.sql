-- Link each intern's template-sourced task to the template task it was copied
-- from. Until now intern tasks were tied to templates only by (milestone, name),
-- so renaming a template task left existing copies stale and unrecoverable
-- (their names no longer matched). A stable FK makes propagation reliable.
alter table public.tasks
  add column if not exists template_id uuid
  references public.task_templates(id) on delete set null;

-- Backfill + reconcile. For each intern+phase, pair the intern's template-sourced
-- tasks with that phase's template tasks by order — but only when the counts
-- match (the safe, rename-in-place case). This links them for future renames AND
-- fixes names that diverged before the link existed. Phases whose counts differ
-- (tasks added/removed unevenly) are left untouched for the normal flow to handle.
with ranked_intern as (
  select
    t.id,
    t.intern_id,
    t.milestone_id,
    row_number() over (
      partition by t.intern_id, t.milestone_id
      order by t.created_at, t.id
    ) as rn,
    count(*) over (partition by t.intern_id, t.milestone_id) as cnt
  from public.tasks t
  where t.source = 'template'
),
ranked_tpl as (
  select
    tt.id,
    tt.milestone_id,
    tt.name,
    row_number() over (
      partition by tt.milestone_id
      order by tt.sequence, tt.id
    ) as rn,
    count(*) over (partition by tt.milestone_id) as cnt
  from public.task_templates tt
)
update public.tasks t
set template_id = rt.id, name = rt.name
from ranked_intern ri
join ranked_tpl rt
  on rt.milestone_id = ri.milestone_id
 and rt.rn = ri.rn
 and rt.cnt = ri.cnt
where t.id = ri.id;

create index if not exists tasks_template_id_idx on public.tasks (template_id);
