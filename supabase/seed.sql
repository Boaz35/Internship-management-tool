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

-- ---------------------------------------------------------------------------
-- Feedback v2 — 11 predefined, bilingual feedback categories.
-- Idempotent on name_en (unique index from migration 0005).
-- ---------------------------------------------------------------------------
insert into public.feedback_categories
  (name_en, name_he, tag_en, tag_he, description_en, description_he, source, sequence)
values
  ('Approach to a new task', 'גישה למשימה חדשה',
   'Openness & initiative', 'פתיחות ויוזמה',
   'How the intern opens an unfamiliar task — curiosity, initiative, and willingness to start.',
   'איך המתמחה ניגש למשימה לא מוכרת — סקרנות, יוזמה ונכונות להתחיל.',
   'predefined', 1),
  ('Independent learning', 'למידה עצמאית',
   'Exploration', 'חקר',
   'Self-driven exploration and use of resources before asking for help.',
   'חקר עצמאי ושימוש במשאבים לפני פנייה לעזרה.',
   'predefined', 2),
  ('Quality of questions', 'איכות השאלות',
   'Precision & relevance', 'דיוק ורלוונטיות',
   'How precise and relevant the questions are, and whether they move the work forward.',
   'עד כמה השאלות מדויקות ורלוונטיות ומקדמות את העבודה.',
   'predefined', 3),
  ('Raising a flag in time', 'הרמת דגל בזמן',
   'Transparency & timing', 'שקיפות ותזמון',
   'Flagging blockers, risks, and delays early and transparently.',
   'העלאת חסמים, סיכונים ועיכובים מוקדם ובשקיפות.',
   'predefined', 4),
  ('Teamwork', 'עבודת צוות',
   'Sharing & consulting', 'שיתוף והיוועצות',
   'Sharing work, consulting others, and collaborating within the team.',
   'שיתוף בעבודה, היוועצות עם אחרים ושיתוף פעולה בצוות.',
   'predefined', 5),
  ('Creativity', 'יצירתיות',
   'Originality & flexibility', 'מקוריות וגמישות',
   'Original thinking and flexibility in exploring alternative solutions.',
   'חשיבה מקורית וגמישות בבחינת פתרונות חלופיים.',
   'predefined', 6),
  ('Judgment with AI', 'שיפוט מול AI',
   'Critical judgment', 'ביקורתיות ושיקול-דעת',
   'Critical judgment when using AI tools — verifying, questioning, and adapting output.',
   'שיקול-דעת ביקורתי בשימוש בכלי AI — אימות, הטלת ספק והתאמת הפלט.',
   'predefined', 7),
  ('Attention to detail', 'תשומת לב לפרטים',
   'Precision & rigor', 'דיוק וקפדנות',
   'Precision and rigor in the details of the work.',
   'דיוק וקפדנות בפרטי העבודה.',
   'predefined', 8),
  ('Receiving feedback', 'קבלת פידבק',
   'Openness & application', 'פתיחות ויישום',
   'Openness to feedback and how well it is applied afterwards.',
   'פתיחות לקבלת פידבק ומידת היישום שלו בהמשך.',
   'predefined', 9),
  ('Systemic view', 'ראייה מערכתית',
   'Perspective & context', 'פרספקטיבה והקשר',
   'Seeing the bigger picture and understanding the context around the task.',
   'ראיית התמונה הרחבה והבנת ההקשר סביב המשימה.',
   'predefined', 10),
  ('Commitment to the process', 'מחויבות לתהליך',
   'Consistency & responsibility', 'עקביות ואחריות',
   'Consistency, reliability, and taking responsibility through the process.',
   'עקביות, אמינות ולקיחת אחריות לאורך התהליך.',
   'predefined', 11)
on conflict (name_en) do nothing;

