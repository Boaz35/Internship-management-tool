-- Allow mentors (designers), in addition to team leaders, to edit the shared
-- program template: milestones (phases) and their default tasks. Adding a
-- template task also propagates a task row to every existing intern, so the
-- tasks_insert policy must permit template-sourced inserts by template editors.

-- Milestones (phases): designers + team leaders may write.
drop policy if exists milestones_write on public.milestones;
create policy milestones_write on public.milestones
  for all to authenticated
  using (public.is_team_leader() or public.auth_role() = 'designer')
  with check (public.is_team_leader() or public.auth_role() = 'designer');

-- Task templates: designers + team leaders may write.
drop policy if exists templates_write on public.task_templates;
create policy templates_write on public.task_templates
  for all to authenticated
  using (public.is_team_leader() or public.auth_role() = 'designer')
  with check (public.is_team_leader() or public.auth_role() = 'designer');

-- Tasks insert: keep the per-intern rules, but also let a template editor
-- (designer/leader) insert template-sourced rows for ANY intern — this is how
-- newly added template tasks fan out to the whole current cohort.
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (
    public.is_assigned_designer(intern_id)
    or public.is_team_leader()
    or (source = 'template' and public.auth_role() = 'designer')
  );
