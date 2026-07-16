-- ===========================================================================
-- Fix: intern can't see TEMPLATE task links (mentor/leader can).
--
-- Cause: the intern dashboard resolves each template link through the
-- task_templates row it belongs to. If the intern can't SELECT task_templates
-- (RLS), the links are silently dropped for interns only.
--
-- Run in the Supabase SQL editor. Sections 1–3 are READ ONLY.
-- Section 4 safely re-applies the read policy (idempotent).
-- ===========================================================================

-- 1) Is RLS on, and what SELECT policy governs task_templates?
--    Expect a policy with cmd = SELECT and qual = true.
select tablename, policyname, cmd, roles, qual
from pg_policies
where tablename = 'task_templates'
order by policyname;

-- 2) Also confirm the template-links table is world-readable to signed-in users.
--    Expect ttl_select with qual = true.
select tablename, policyname, cmd, qual
from pg_policies
where tablename = 'task_template_links'
order by policyname;

-- 3) Sanity-check the data exists (replace the email).
with the_intern as (
  select i.id as intern_id
  from public.interns i
  join public.users u on u.id = i.user_id
  where u.email = 'INTERN_EMAIL@zemingo.com'
)
select
  (select count(*) from public.task_templates)        as templates_total,
  (select count(*) from public.task_template_links)   as template_links_total,
  (select count(*) from public.tasks t
     where t.intern_id = (select intern_id from the_intern)) as intern_tasks;

-- ===========================================================================
-- 4) FIX — re-apply the read policies. Safe to run repeatedly.
-- ===========================================================================

-- Templates: readable by any signed-in user (interns included).
drop policy if exists templates_select on public.task_templates;
create policy templates_select on public.task_templates
  for select to authenticated using (true);

-- Template links: readable by any signed-in user.
drop policy if exists ttl_select on public.task_template_links;
create policy ttl_select on public.task_template_links
  for select to authenticated using (true);
