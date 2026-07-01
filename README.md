# Internship Management Tool

A role-based web platform to run a design-studio internship program: interns track tasks and log hours, mentors approve work and keep private notes, and team leaders manage allocation, the program template, and end-of-internship summaries.

Built with **Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + RLS) · Google auth**.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in the values
npm run dev
```

### 1. Create a Supabase project

From the [Supabase dashboard](https://supabase.com/dashboard), create a project and copy into `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Project settings → API)

Set `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN` to your Google Workspace domain (e.g. `zemingo.com`) and `NEXT_PUBLIC_SITE_URL` to your dev/prod URL.

### 2. Apply the schema

Run the SQL files in order in the Supabase SQL editor (or via the Supabase CLI):

1. `supabase/migrations/0001_schema.sql` — tables, enums, signup trigger
2. `supabase/migrations/0002_rls.sql` — Row Level Security policies
3. `supabase/seed.sql` — milestones + default task templates

### 3. Configure Google auth

In Supabase → Authentication → Providers → Google, enable Google and add your OAuth client ID/secret (create it in Google Cloud Console). Add the redirect URL `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` in Google, and add `${NEXT_PUBLIC_SITE_URL}/auth/callback` to Supabase's allowed redirect URLs. Domain restriction is enforced both via the `hd` hint and a server-side check in `src/app/auth/callback/route.ts`.

### 4. Promote the first team leader

Everyone signs in as an `intern` by default. After you sign in once, promote yourself in the SQL editor:

```sql
update public.users set role = 'team_leader' where email = 'you@yourdomain.com';
```

From then on you can manage roles, allocation, and the template from the UI.

## Roles

| Role | Sees | Can do |
|---|---|---|
| **Team Leader** | Everything | Allocate interns, edit template, drill into any intern incl. notes |
| **Designer (Mentor)** | Only their allocated intern(s) | Approve tasks, add custom tasks, write private notes, view hours |
| **Intern** | Their own dashboard | Mark tasks done, log hours/vacation/sick, view progress |

**Notes are private per intern** — readable only by the assigned designer and team leaders, enforced at the database level via RLS.

## Progress model

- **Per-milestone:** task completion (approved / total).
- **Overall:** hours logged against the 186-hour target. Vacation and sick time don't reduce the target — they push the projected end date out (≈9 work hours/day).

## Project structure

```
src/
  app/
    login/                Google sign-in
    auth/callback         OAuth code exchange + domain check
    intern/               Intern dashboard
    designer/             Mentor dashboard + per-intern view
    leader/               Overview, allocation, template editor
    summary/[internId]/   Editable summary document
    actions/              Server actions (intern, designer, leader, summary)
  components/             UI: task lists, hours, notes, progress, editors
  lib/
    supabase/             Browser/server/middleware clients
    auth.ts               Session + role helpers
    progress.ts           Hours & milestone calculations
    database.types.ts     Typed schema
supabase/                 SQL migrations + seed
```

## Deploy

Push to GitHub and import into [Vercel](https://vercel.com). Add the same environment variables in the Vercel project settings, and set `NEXT_PUBLIC_SITE_URL` to the production URL.

## Notes / v1 scope

- Notifications are refresh-based badges (no realtime) — sufficient for a small cohort.
- Summary export is Markdown (`.md`); PDF/Google Doc export is a later enhancement.
- Welcome Day task list is a starting point — adjust it in the template editor.
