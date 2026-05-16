/**
 * lib/supabase/finishedMakeComments.ts
 *
 * Phase 2.3 — Supabase-backed comments on finished makes.
 *
 * Author display info is joined from `profiles` at read time so renaming
 * propagates without a backfill.
 */

import { supabase } from '@/lib/supabase/client';

// ── Types ────────────────────────────────────────────────────────────────────

interface DbCommentRow {
  id: string;
  finished_make_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

/**
 * UI-facing comment shape. Same field names as the legacy interface so the
 * UI render code is unchanged.
 */
export interface FinishedMakeCommentWithAuthor {
  id: string;
  makeId: string;
  authorId: string;
  displayName: string;
  message: string;
  createdAt: string;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

async function getAuthUser(): Promise<{ id: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated');
  return data.user;
}

// ── Profile join ─────────────────────────────────────────────────────────────

async function resolveAuthorNames(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return map;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', unique);

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[finishedMakeComments] resolveAuthorNames failed', error);
    }
    return map;
  }

  for (const row of data ?? []) {
    map.set(
      (row as { id: string }).id,
      ((row as { display_name: string | null }).display_name ?? '').trim() || 'Maker',
    );
  }
  return map;
}

function rowToComment(
  row: DbCommentRow,
  names: Map<string, string>,
): FinishedMakeCommentWithAuthor {
  return {
    id: row.id,
    makeId: row.finished_make_id,
    authorId: row.user_id,
    displayName: names.get(row.user_id) ?? 'Maker',
    message: row.message,
    createdAt: row.created_at,
  };
}

// ── Reads ────────────────────────────────────────────────────────────────────

/** Comments for a finished make, oldest-first. */
export async function getCommentsForMake(
  makeId: string,
): Promise<FinishedMakeCommentWithAuthor[]> {
  const { data, error } = await supabase
    .from('finished_make_comments')
    .select('*')
    .eq('finished_make_id', makeId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  const rows = (data as DbCommentRow[]) ?? [];
  const names = await resolveAuthorNames(rows.map((r) => r.user_id));
  return rows.map((r) => rowToComment(r, names));
}

/**
 * Count of comments per finished-make for a batch of make IDs.
 * Used by project pages to render "X comments" hint without fetching full rows.
 */
export async function getCommentCountsForMakes(
  makeIds: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (makeIds.length === 0) return counts;

  const { data, error } = await supabase
    .from('finished_make_comments')
    .select('finished_make_id')
    .in('finished_make_id', makeIds);

  if (error) throw error;
  for (const row of (data as { finished_make_id: string }[]) ?? []) {
    counts[row.finished_make_id] = (counts[row.finished_make_id] ?? 0) + 1;
  }
  return counts;
}

// ── Write ────────────────────────────────────────────────────────────────────

/** Append a comment to a finished make. Author = current authenticated user. */
export async function createComment(input: {
  makeId: string;
  message: string;
}): Promise<FinishedMakeCommentWithAuthor> {
  const authUser = await getAuthUser();

  const { data, error } = await supabase
    .from('finished_make_comments')
    .insert({
      finished_make_id: input.makeId,
      user_id: authUser.id,
      message: input.message,
    })
    .select('*')
    .single();

  if (error) throw error;

  const names = await resolveAuthorNames([authUser.id]);
  return rowToComment(data as DbCommentRow, names);
}
