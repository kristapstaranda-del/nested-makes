/**
 * lib/supabase/challenges.ts
 *
 * Phase 2.1 — Supabase-backed CRUD for the `challenges` table.
 *
 * RLS model: every row carries user_id; SELECT/INSERT/UPDATE/DELETE all gated
 * by auth.uid() = user_id. The helpers below derive user_id from the live
 * Supabase session (`getAuthUser`) so callers never pass it in — same pattern
 * as lib/supabase/userProjects.ts.
 *
 * Soft-archive model:
 *   archived_at IS NULL  → active challenge (shown on /challenges)
 *   archived_at NOT NULL → archived challenge (shown in archived section)
 *
 * Restoring an archived challenge = clearing archived_at.
 */

import { supabase } from '@/lib/supabase/client';

// ── Types ────────────────────────────────────────────────────────────────────

export type ChallengePlanType = 'time_daily' | 'rows_daily' | 'days_per_week';

export interface ChallengePlan {
  type: ChallengePlanType;
  target: number;
}

export interface SupabaseChallenge {
  id: string;
  user_id: string;
  project_id: string;
  plan_type: ChallengePlanType | null;
  plan_target: number | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Convenience shape that matches the legacy localStorage interface used across
 * the app components (challengeId / projectId / plan / createdAt). Components
 * can keep their existing UI code mostly unchanged by working with this shape.
 */
export interface ActiveChallenge {
  challengeId: string;
  projectId: string;
  plan: ChallengePlan | null;
  createdAt: string; // YYYY-MM-DD
}

// ── Auth helper ──────────────────────────────────────────────────────────────

async function getAuthUser(): Promise<{ id: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated');
  return data.user;
}

// ── Row mapping ──────────────────────────────────────────────────────────────

function rowToActiveChallenge(row: SupabaseChallenge): ActiveChallenge {
  return {
    challengeId: row.id,
    projectId: row.project_id,
    plan:
      row.plan_type && row.plan_target !== null
        ? { type: row.plan_type, target: row.plan_target }
        : null,
    createdAt: row.created_at.split('T')[0],
  };
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Returns active (non-archived) challenges for the current user, newest first.
 * Returns [] if no session.
 */
export async function getActiveChallenges(): Promise<ActiveChallenge[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('user_id', userData.user.id)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as SupabaseChallenge[]).map(rowToActiveChallenge);
}

/**
 * Returns archived challenges for the current user, newest archived first.
 * Returns [] if no session.
 */
export async function getArchivedChallenges(): Promise<ActiveChallenge[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('user_id', userData.user.id)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false });

  if (error) throw error;
  return (data as SupabaseChallenge[]).map(rowToActiveChallenge);
}

/**
 * Returns a single challenge by id, regardless of archived status.
 * Returns null if not found or not owned by the current user (RLS filters it out).
 */
export async function getChallenge(id: string): Promise<ActiveChallenge | null> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return rowToActiveChallenge(data as SupabaseChallenge);
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Create a new challenge with an optional plan.
 * The DB generates the UUID; we return the saved row shaped as ActiveChallenge.
 */
export async function createChallenge(data: {
  projectId: string;
  plan: ChallengePlan | null;
}): Promise<ActiveChallenge> {
  const authUser = await getAuthUser();

  const { data: inserted, error } = await supabase
    .from('challenges')
    .insert({
      user_id: authUser.id,
      project_id: data.projectId,
      plan_type: data.plan?.type ?? null,
      plan_target: data.plan?.target ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return rowToActiveChallenge(inserted as SupabaseChallenge);
}

/**
 * Update the plan on an existing challenge. Pass null to clear the plan.
 */
export async function updateChallengePlan(
  challengeId: string,
  plan: ChallengePlan | null,
): Promise<ActiveChallenge> {
  const authUser = await getAuthUser();

  const { data, error } = await supabase
    .from('challenges')
    .update({
      plan_type: plan?.type ?? null,
      plan_target: plan?.target ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', challengeId)
    .eq('user_id', authUser.id)
    .select('*')
    .single();

  if (error) throw error;
  return rowToActiveChallenge(data as SupabaseChallenge);
}

/**
 * Soft-archive a challenge by setting archived_at = now().
 * Idempotent: if already archived, this just refreshes the timestamp.
 */
export async function archiveChallenge(challengeId: string): Promise<void> {
  const authUser = await getAuthUser();

  const { error } = await supabase
    .from('challenges')
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', challengeId)
    .eq('user_id', authUser.id);

  if (error) throw error;
}

/**
 * Restore an archived challenge back to active by clearing archived_at.
 */
export async function restoreChallenge(challengeId: string): Promise<void> {
  const authUser = await getAuthUser();

  const { error } = await supabase
    .from('challenges')
    .update({
      archived_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', challengeId)
    .eq('user_id', authUser.id);

  if (error) throw error;
}

/**
 * Hard-delete a challenge. Cascades to related check_ins via FK ON DELETE CASCADE.
 * Currently unused by the UI but exposed for completeness.
 */
export async function deleteChallenge(challengeId: string): Promise<void> {
  const authUser = await getAuthUser();

  const { error } = await supabase
    .from('challenges')
    .delete()
    .eq('id', challengeId)
    .eq('user_id', authUser.id);

  if (error) throw error;
}

/**
 * Convenience helper used by lib/challengeArchive.ts after a finished-make
 * submission. Looks up the active challenge by challengeId OR projectId and
 * archives it. Silent no-op if nothing matches.
 */
export async function archiveChallengeAfterFinish(opts: {
  challengeId?: string;
  projectId?: string;
}): Promise<void> {
  const { challengeId, projectId } = opts;
  if (!challengeId && !projectId) return;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  // If we have a direct challengeId, archive it (only if currently active).
  if (challengeId) {
    const { error } = await supabase
      .from('challenges')
      .update({
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', challengeId)
      .eq('user_id', userData.user.id)
      .is('archived_at', null);
    if (error) {
      // Silent — must not break the main submission flow.
      if (process.env.NODE_ENV === 'development') {
        console.warn('[archiveChallengeAfterFinish] by challengeId failed', error);
      }
    }
    return;
  }

  // Fallback: archive the most recent active challenge for this project.
  if (projectId) {
    const { data: rows, error: lookupError } = await supabase
      .from('challenges')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('project_id', projectId)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (lookupError) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[archiveChallengeAfterFinish] lookup by projectId failed', lookupError);
      }
      return;
    }

    const target = rows?.[0];
    if (!target) return;

    const { error: updateError } = await supabase
      .from('challenges')
      .update({
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', target.id)
      .eq('user_id', userData.user.id);

    if (updateError && process.env.NODE_ENV === 'development') {
      console.warn('[archiveChallengeAfterFinish] update by projectId failed', updateError);
    }
  }
}

// ── Counts (for profile/home dashboards) ─────────────────────────────────────

/**
 * Returns counts of active and archived challenges for the current user.
 * Cheap one-shot for dashboards that just need totals.
 */
export async function getChallengeCounts(): Promise<{
  active: number;
  archived: number;
}> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { active: 0, archived: 0 };

  const [{ count: activeCount, error: activeError }, { count: archivedCount, error: archivedError }] =
    await Promise.all([
      supabase
        .from('challenges')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userData.user.id)
        .is('archived_at', null),
      supabase
        .from('challenges')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userData.user.id)
        .not('archived_at', 'is', null),
    ]);

  if (activeError) throw activeError;
  if (archivedError) throw archivedError;

  return {
    active: activeCount ?? 0,
    archived: archivedCount ?? 0,
  };
}
