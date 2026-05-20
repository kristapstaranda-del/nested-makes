-- =============================================================================
-- HobbyBuddy — Phase 2.4: Project FK tightening
-- =============================================================================
--
-- Phase 2.4 removes the static mock projects (app/data/projects.ts), so the
-- only valid `project_id` values from now on live in `user_projects.id`. This
-- migration tightens the column type from `text` to `uuid` and adds the
-- foreign-key reference.
--
-- Existing rows that don't satisfy the FK are deleted in a pre-step:
--   • non-UUID `project_id` (legacy mock IDs like '1', 'k1', etc.)
--   • UUIDs that don't exist in user_projects (orphan refs)
--
-- This is destructive for rows that pointed at mock projects, which is what
-- we want — those rows became meaningless once mocks were removed.
--
-- Run this AFTER deploying the Phase 2.4 application code.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Clean orphan / non-UUID rows before tightening the FK
-- -----------------------------------------------------------------------------

-- finished_makes: cascade deletes images, reactions, comments via the
-- existing on-delete-cascade FKs from Phase 2.
delete from public.finished_makes fm
where  fm.project_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or  not exists (
         select 1 from public.user_projects up
         where  up.id::text = fm.project_id
       );

-- challenges: cascade deletes check_ins (and through them, reactions/replies)
-- via the existing on-delete-cascade FKs. challenge_id on finished_makes is
-- ON DELETE SET NULL, so completion records survive.
delete from public.challenges c
where  c.project_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or  not exists (
         select 1 from public.user_projects up
         where  up.id::text = c.project_id
       );

-- -----------------------------------------------------------------------------
-- 2. Tighten challenges.project_id  →  uuid references user_projects(id)
-- -----------------------------------------------------------------------------

-- 2a. Convert column type to uuid.
alter table public.challenges
  alter column project_id type uuid using project_id::uuid;

-- 2b. Add the foreign key (on delete cascade: removing a user project
--     removes its challenges; check_ins cascade off challenges as before).
alter table public.challenges
  add constraint challenges_project_id_fkey
  foreign key (project_id) references public.user_projects(id)
  on delete cascade;

-- The existing partial indexes on (user_id, archived_at) remain useful;
-- the project_id idx from Phase 2 stays valid since type changed in-place.

-- -----------------------------------------------------------------------------
-- 3. Tighten finished_makes.project_id  →  uuid references user_projects(id)
-- -----------------------------------------------------------------------------

alter table public.finished_makes
  alter column project_id type uuid using project_id::uuid;

alter table public.finished_makes
  add constraint finished_makes_project_id_fkey
  foreign key (project_id) references public.user_projects(id)
  on delete cascade;

-- -----------------------------------------------------------------------------
-- 4. Allow public-read on user_projects so /discover can list everyone's
--    is_public=true projects after the mock library is removed.
-- -----------------------------------------------------------------------------
-- These policies are additive — existing owner-scoped policies stay intact.
-- If the SELECT policy below already exists from Phase 1, the drop+create
-- pair makes the script safe to re-run.

drop policy if exists "user_projects_public_select" on public.user_projects;
create policy "user_projects_public_select" on public.user_projects
  for select to authenticated using (is_public = true);

drop policy if exists "project_images_public_select" on public.project_images;
create policy "project_images_public_select" on public.project_images
  for select to authenticated using (
    exists (
      select 1 from public.user_projects up
      where  up.id = project_id
        and  up.is_public = true
    )
  );

-- =============================================================================
-- DONE — Phase 2.4 schema applied.
-- =============================================================================
-- Verify with:
--
--   select
--     conname,
--     pg_get_constraintdef(c.oid) as definition
--   from pg_constraint c
--   join pg_class t on t.oid = c.conrelid
--   where t.relname in ('challenges', 'finished_makes')
--     and c.contype = 'f';
--
-- Expected: each table now has a project_id_fkey referencing user_projects(id).
-- =============================================================================
