-- =============================================================================
-- HobbyBuddy — Phase 2: Challenges migration
-- =============================================================================
--
-- This migration introduces the full challenge/habit/community data model.
-- Run this in Supabase SQL Editor against the same project that already hosts
-- Phase 1 (profiles + user_projects + project-images bucket).
--
-- Conventions (matching Phase 1):
--   • All primary keys are UUIDs (gen_random_uuid()) unless noted.
--   • user_id columns FK -> auth.users(id) with ON DELETE CASCADE so removing
--     an auth user removes their owned content (storage objects cleaned up by
--     the app layer — see lib/supabase helpers).
--   • RLS is enabled on EVERY table. No table is open to public writes.
--   • Read visibility model:
--       - private to owner: challenges, habits, habit_logs
--       - public to all authenticated users: check_ins (+reactions/+replies),
--         finished_makes (+images/+reactions/+comments)
--   • project_id is text for now to allow static curated project IDs during
--     the transition. Phase 2.4 will swap to `uuid references user_projects(id)`
--     once mock projects are removed.
--
-- Safe to re-run: every CREATE uses IF NOT EXISTS where possible. RLS policies
-- are dropped + recreated so changes are picked up on re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- 2. TABLE: challenges
-- -----------------------------------------------------------------------------
-- One row per challenge the user has started against a project.
-- Soft-archive via archived_at (NULL = active, non-NULL = archived).
-- Plan can be NULL (challenge created without a plan; UI guards against this).

create table if not exists public.challenges (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  project_id    text        not null,
  plan_type     text        null
                check (plan_type in ('time_daily','rows_daily','days_per_week')),
  plan_target   int         null,
  archived_at   timestamptz null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists challenges_user_active_idx
  on public.challenges (user_id, archived_at) where archived_at is null;
create index if not exists challenges_user_archived_idx
  on public.challenges (user_id, archived_at) where archived_at is not null;
create index if not exists challenges_project_idx
  on public.challenges (project_id);

alter table public.challenges enable row level security;

drop policy if exists "challenges_owner_select" on public.challenges;
create policy "challenges_owner_select" on public.challenges
  for select using (auth.uid() = user_id);

drop policy if exists "challenges_owner_insert" on public.challenges;
create policy "challenges_owner_insert" on public.challenges
  for insert with check (auth.uid() = user_id);

drop policy if exists "challenges_owner_update" on public.challenges;
create policy "challenges_owner_update" on public.challenges
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "challenges_owner_delete" on public.challenges;
create policy "challenges_owner_delete" on public.challenges
  for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 3. TABLE: habits
-- -----------------------------------------------------------------------------
-- Private daily habit. Current app model allows only one ACTIVE habit per user.
-- The partial unique index enforces that at the DB level while still preserving
-- history (archived habits remain queryable for stats).

create table if not exists public.habits (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  plan_type     text        not null
                check (plan_type in ('time_daily','rows_daily','days_per_week')),
  plan_target   int         not null,
  archived_at   timestamptz null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists habits_one_active_per_user_idx
  on public.habits (user_id) where archived_at is null;
create index if not exists habits_user_idx on public.habits (user_id);

alter table public.habits enable row level security;

drop policy if exists "habits_owner_select" on public.habits;
create policy "habits_owner_select" on public.habits
  for select using (auth.uid() = user_id);

drop policy if exists "habits_owner_insert" on public.habits;
create policy "habits_owner_insert" on public.habits
  for insert with check (auth.uid() = user_id);

drop policy if exists "habits_owner_update" on public.habits;
create policy "habits_owner_update" on public.habits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "habits_owner_delete" on public.habits;
create policy "habits_owner_delete" on public.habits
  for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 4. TABLE: habit_logs
-- -----------------------------------------------------------------------------
-- One row per habit per day. Unique constraint enforces the current "one log
-- per day" UI rule at the DB level.
-- user_id is denormalised here so RLS can be checked without a join.

create table if not exists public.habit_logs (
  id          uuid        primary key default gen_random_uuid(),
  habit_id    uuid        not null references public.habits(id) on delete cascade,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  log_date    date        not null,
  status      text        not null check (status in ('done','missed')),
  created_at  timestamptz not null default now(),
  unique (habit_id, log_date)
);

create index if not exists habit_logs_habit_date_idx
  on public.habit_logs (habit_id, log_date desc);
create index if not exists habit_logs_user_date_idx
  on public.habit_logs (user_id, log_date desc);

alter table public.habit_logs enable row level security;

drop policy if exists "habit_logs_owner_select" on public.habit_logs;
create policy "habit_logs_owner_select" on public.habit_logs
  for select using (auth.uid() = user_id);

drop policy if exists "habit_logs_owner_insert" on public.habit_logs;
create policy "habit_logs_owner_insert" on public.habit_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "habit_logs_owner_update" on public.habit_logs;
create policy "habit_logs_owner_update" on public.habit_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "habit_logs_owner_delete" on public.habit_logs;
create policy "habit_logs_owner_delete" on public.habit_logs
  for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 5. TABLE: check_ins
-- -----------------------------------------------------------------------------
-- Public daily progress updates posted against a challenge.
-- One per challenge per day (matches current UI's "Already completed today").
-- image_path is the storage object path inside the check-in-images bucket.

create table if not exists public.check_ins (
  id            uuid        primary key default gen_random_uuid(),
  challenge_id  uuid        not null references public.challenges(id) on delete cascade,
  user_id       uuid        not null references auth.users(id) on delete cascade,
  log_date      date        not null,
  message       text        not null default '',
  image_path    text        null,
  created_at    timestamptz not null default now(),
  unique (challenge_id, log_date)
);

create index if not exists check_ins_challenge_date_idx
  on public.check_ins (challenge_id, log_date desc);
create index if not exists check_ins_user_date_idx
  on public.check_ins (user_id, log_date desc);
create index if not exists check_ins_created_idx
  on public.check_ins (created_at desc);

alter table public.check_ins enable row level security;

-- Public read for any authenticated user (community feed visibility).
drop policy if exists "check_ins_authenticated_select" on public.check_ins;
create policy "check_ins_authenticated_select" on public.check_ins
  for select to authenticated using (true);

drop policy if exists "check_ins_owner_insert" on public.check_ins;
create policy "check_ins_owner_insert" on public.check_ins
  for insert with check (auth.uid() = user_id);

drop policy if exists "check_ins_owner_update" on public.check_ins;
create policy "check_ins_owner_update" on public.check_ins
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "check_ins_owner_delete" on public.check_ins;
create policy "check_ins_owner_delete" on public.check_ins
  for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 6. TABLE: check_in_reactions
-- -----------------------------------------------------------------------------
-- One reaction per (check_in, user). Composite PK enforces uniqueness.

create table if not exists public.check_in_reactions (
  check_in_id  uuid        not null references public.check_ins(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (check_in_id, user_id)
);

create index if not exists check_in_reactions_user_idx
  on public.check_in_reactions (user_id);

alter table public.check_in_reactions enable row level security;

drop policy if exists "check_in_reactions_authenticated_select" on public.check_in_reactions;
create policy "check_in_reactions_authenticated_select" on public.check_in_reactions
  for select to authenticated using (true);

drop policy if exists "check_in_reactions_owner_insert" on public.check_in_reactions;
create policy "check_in_reactions_owner_insert" on public.check_in_reactions
  for insert with check (auth.uid() = user_id);

drop policy if exists "check_in_reactions_owner_delete" on public.check_in_reactions;
create policy "check_in_reactions_owner_delete" on public.check_in_reactions
  for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 7. TABLE: check_in_replies
-- -----------------------------------------------------------------------------
-- One-level-only replies (no parent_reply_id field — enforced structurally).

create table if not exists public.check_in_replies (
  id           uuid        primary key default gen_random_uuid(),
  check_in_id  uuid        not null references public.check_ins(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  message      text        not null check (char_length(message) > 0),
  created_at   timestamptz not null default now()
);

create index if not exists check_in_replies_check_in_idx
  on public.check_in_replies (check_in_id, created_at asc);
create index if not exists check_in_replies_user_idx
  on public.check_in_replies (user_id);

alter table public.check_in_replies enable row level security;

drop policy if exists "check_in_replies_authenticated_select" on public.check_in_replies;
create policy "check_in_replies_authenticated_select" on public.check_in_replies
  for select to authenticated using (true);

drop policy if exists "check_in_replies_owner_insert" on public.check_in_replies;
create policy "check_in_replies_owner_insert" on public.check_in_replies
  for insert with check (auth.uid() = user_id);

drop policy if exists "check_in_replies_owner_update" on public.check_in_replies;
create policy "check_in_replies_owner_update" on public.check_in_replies
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "check_in_replies_owner_delete" on public.check_in_replies;
create policy "check_in_replies_owner_delete" on public.check_in_replies
  for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 8. TABLE: finished_makes
-- -----------------------------------------------------------------------------
-- Public completion showcase. challenge_id may be NULL when the user finishes
-- a project without an active challenge (e.g. retrospective post).
-- ON DELETE SET NULL on challenge_id so archiving/deleting a challenge does
-- not destroy the public completion record.

create table if not exists public.finished_makes (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  project_id    text        not null,
  challenge_id  uuid        null references public.challenges(id) on delete set null,
  caption       text        null,
  created_at    timestamptz not null default now()
);

create index if not exists finished_makes_user_idx
  on public.finished_makes (user_id, created_at desc);
create index if not exists finished_makes_project_idx
  on public.finished_makes (project_id, created_at desc);
create index if not exists finished_makes_challenge_idx
  on public.finished_makes (challenge_id);
create index if not exists finished_makes_created_idx
  on public.finished_makes (created_at desc);

alter table public.finished_makes enable row level security;

drop policy if exists "finished_makes_authenticated_select" on public.finished_makes;
create policy "finished_makes_authenticated_select" on public.finished_makes
  for select to authenticated using (true);

drop policy if exists "finished_makes_owner_insert" on public.finished_makes;
create policy "finished_makes_owner_insert" on public.finished_makes
  for insert with check (auth.uid() = user_id);

drop policy if exists "finished_makes_owner_update" on public.finished_makes;
create policy "finished_makes_owner_update" on public.finished_makes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "finished_makes_owner_delete" on public.finished_makes;
create policy "finished_makes_owner_delete" on public.finished_makes
  for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 9. TABLE: finished_make_images
-- -----------------------------------------------------------------------------
-- Mirrors the project_images model from Phase 1.
-- Exactly one cover per make — enforced by partial unique index.

create table if not exists public.finished_make_images (
  id                uuid        primary key default gen_random_uuid(),
  finished_make_id  uuid        not null references public.finished_makes(id) on delete cascade,
  storage_path      text        not null unique,
  is_cover          boolean     not null default false,
  sort_order        int         not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists finished_make_images_make_idx
  on public.finished_make_images (finished_make_id, sort_order);
create unique index if not exists finished_make_images_one_cover_idx
  on public.finished_make_images (finished_make_id) where is_cover = true;

alter table public.finished_make_images enable row level security;

-- Read is public to authenticated users (images shown on profiles & project pages).
drop policy if exists "finished_make_images_authenticated_select" on public.finished_make_images;
create policy "finished_make_images_authenticated_select" on public.finished_make_images
  for select to authenticated using (true);

-- Write requires the user to own the parent finished_make.
drop policy if exists "finished_make_images_owner_insert" on public.finished_make_images;
create policy "finished_make_images_owner_insert" on public.finished_make_images
  for insert with check (
    exists (
      select 1 from public.finished_makes fm
      where fm.id = finished_make_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "finished_make_images_owner_update" on public.finished_make_images;
create policy "finished_make_images_owner_update" on public.finished_make_images
  for update using (
    exists (
      select 1 from public.finished_makes fm
      where fm.id = finished_make_id and fm.user_id = auth.uid()
    )
  );

drop policy if exists "finished_make_images_owner_delete" on public.finished_make_images;
create policy "finished_make_images_owner_delete" on public.finished_make_images
  for delete using (
    exists (
      select 1 from public.finished_makes fm
      where fm.id = finished_make_id and fm.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 10. TABLE: finished_make_reactions
-- -----------------------------------------------------------------------------

create table if not exists public.finished_make_reactions (
  finished_make_id  uuid        not null references public.finished_makes(id) on delete cascade,
  user_id           uuid        not null references auth.users(id) on delete cascade,
  created_at        timestamptz not null default now(),
  primary key (finished_make_id, user_id)
);

create index if not exists finished_make_reactions_user_idx
  on public.finished_make_reactions (user_id);

alter table public.finished_make_reactions enable row level security;

drop policy if exists "finished_make_reactions_authenticated_select" on public.finished_make_reactions;
create policy "finished_make_reactions_authenticated_select" on public.finished_make_reactions
  for select to authenticated using (true);

drop policy if exists "finished_make_reactions_owner_insert" on public.finished_make_reactions;
create policy "finished_make_reactions_owner_insert" on public.finished_make_reactions
  for insert with check (auth.uid() = user_id);

drop policy if exists "finished_make_reactions_owner_delete" on public.finished_make_reactions;
create policy "finished_make_reactions_owner_delete" on public.finished_make_reactions
  for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 11. TABLE: finished_make_comments
-- -----------------------------------------------------------------------------

create table if not exists public.finished_make_comments (
  id                uuid        primary key default gen_random_uuid(),
  finished_make_id  uuid        not null references public.finished_makes(id) on delete cascade,
  user_id           uuid        not null references auth.users(id) on delete cascade,
  message           text        not null check (char_length(message) > 0),
  created_at        timestamptz not null default now()
);

create index if not exists finished_make_comments_make_idx
  on public.finished_make_comments (finished_make_id, created_at asc);
create index if not exists finished_make_comments_user_idx
  on public.finished_make_comments (user_id);

alter table public.finished_make_comments enable row level security;

drop policy if exists "finished_make_comments_authenticated_select" on public.finished_make_comments;
create policy "finished_make_comments_authenticated_select" on public.finished_make_comments
  for select to authenticated using (true);

drop policy if exists "finished_make_comments_owner_insert" on public.finished_make_comments;
create policy "finished_make_comments_owner_insert" on public.finished_make_comments
  for insert with check (auth.uid() = user_id);

drop policy if exists "finished_make_comments_owner_update" on public.finished_make_comments;
create policy "finished_make_comments_owner_update" on public.finished_make_comments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "finished_make_comments_owner_delete" on public.finished_make_comments;
create policy "finished_make_comments_owner_delete" on public.finished_make_comments
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- 12. STORAGE BUCKETS
-- =============================================================================
-- Two new public buckets, mirroring project-images from Phase 1.
-- Public read URLs simplify rendering (no signed-URL refresh dance), while RLS
-- on storage.objects restricts writes to auth.uid()-prefixed paths.

insert into storage.buckets (id, name, public)
values ('check-in-images', 'check-in-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('make-images', 'make-images', true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 12a. STORAGE RLS — check-in-images
-- -----------------------------------------------------------------------------
-- Path convention: {auth.uid}/{challengeId}/{imageId}.{ext}
-- First folder MUST equal auth.uid() — same pattern as project-images.

drop policy if exists "check_in_images_public_read" on storage.objects;
create policy "check_in_images_public_read" on storage.objects
  for select using (bucket_id = 'check-in-images');

drop policy if exists "check_in_images_owner_insert" on storage.objects;
create policy "check_in_images_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'check-in-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "check_in_images_owner_update" on storage.objects;
create policy "check_in_images_owner_update" on storage.objects
  for update using (
    bucket_id = 'check-in-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "check_in_images_owner_delete" on storage.objects;
create policy "check_in_images_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'check-in-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- 12b. STORAGE RLS — make-images
-- -----------------------------------------------------------------------------
-- Path convention: {auth.uid}/{finishedMakeId}/{imageId}.{ext}

drop policy if exists "make_images_public_read" on storage.objects;
create policy "make_images_public_read" on storage.objects
  for select using (bucket_id = 'make-images');

drop policy if exists "make_images_owner_insert" on storage.objects;
create policy "make_images_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'make-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "make_images_owner_update" on storage.objects;
create policy "make_images_owner_update" on storage.objects
  for update using (
    bucket_id = 'make-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "make_images_owner_delete" on storage.objects;
create policy "make_images_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'make-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- DONE — Phase 2 schema applied.
-- =============================================================================
-- Verify with the following queries in Supabase SQL Editor:
--
--   select table_name from information_schema.tables
--   where table_schema = 'public' and table_name in (
--     'challenges','habits','habit_logs','check_ins','check_in_reactions',
--     'check_in_replies','finished_makes','finished_make_images',
--     'finished_make_reactions','finished_make_comments'
--   );
--
--   select id, name, public from storage.buckets
--   where id in ('check-in-images','make-images');
--
-- Expected: 10 tables, 2 buckets.
-- =============================================================================
