-- Internship Management Tool — seed data
-- Milestones + default task templates from the program spec.
-- Safe to run repeatedly (idempotent on milestone name).

insert into public.milestones (name, sequence, description) values
  ('Welcome Day', 1, 'Introductions and HR onboarding meetings.'),
  ('Figma Alignment', 2, 'Align with the studio''s product-design methods and Figma-to-dev handoff practices.'),
  ('Concept Brief', 3, 'Brainstorm, design, and build your own project.'),
  ('Presentation Day', 4, 'Shared day where all interns present their final projects.')
on conflict do nothing;

-- Default tasks per milestone. Adjust freely from the template editor later.
with m as (select id, name from public.milestones)
insert into public.task_templates (milestone_id, name, sequence)
select m.id, t.name, t.sequence
from m
join (values
  ('Welcome Day',      'Team introductions',                    1),
  ('Welcome Day',      'HR onboarding meeting',                 2),
  ('Welcome Day',      'Set up accounts and tools',             3),
  ('Figma Alignment',  'Studio design methodology walkthrough', 1),
  ('Figma Alignment',  'Figma fundamentals & file structure',   2),
  ('Figma Alignment',  'Components & variants exercise',         3),
  ('Figma Alignment',  'Design-to-dev handoff practices',       4),
  ('Figma Alignment',  'Accessibility basics',                  5),
  ('Figma Alignment',  'Design review shadowing',               6),
  ('Concept Brief',    'Brainstorm project ideas',              1),
  ('Concept Brief',    'Define project scope & goals',          2),
  ('Concept Brief',    'Wireframes & low-fidelity design',      3),
  ('Concept Brief',    'High-fidelity design in Figma',         4),
  ('Concept Brief',    'Build the prototype',                   5),
  ('Presentation Day', 'Prepare presentation deck',             1),
  ('Presentation Day', 'Present final project',                 2)
) as t(milestone_name, name, sequence) on t.milestone_name = m.name
where not exists (
  select 1 from public.task_templates tt
  where tt.milestone_id = m.id and tt.name = t.name
);
