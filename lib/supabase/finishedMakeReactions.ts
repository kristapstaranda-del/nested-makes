/**
 * lib/supabase/finishedMakeReactions.ts
 *
 * Phase 2.3 — Supabase-backed likes on finished makes.
 *
 * Storage model:
 *   table: finished_make_reactions
 *   composite PK (finished_make_id, user_id) — one like per (make, user).
 *
 * RLS:
 *   - select: any authenticated user
 *   - insert/delete: auth.uid() = user_id
 */

import { supabase } from '@/lib/supabase/client';

export interface MakeLikeState {
  count: number;
  liked: boolean;
}

/**
 * Count of likes on a finished make + whether the current user has liked it.
 * Safe to call without a session — `liked` falls back to false.
 */
export async function getMakeLikeState(makeId: string): Promise<MakeLikeState> {
  const userPromise = supabase.auth.getUser();
  const countPromise = supabase
    .from('finished_make_reactions')
    .select('finished_make_id', { count: 'exact', head: true })
    .eq('finished_make_id', makeId);

  const [{ data: userData }, { count, error: countError }] = await Promise.all([
    userPromise,
    countPromise,
  ]);

  if (countError) throw countError;

  let liked = false;
  if (userData.user) {
    const { count: mineCount, error: mineError } = await supabase
      .from('finished_make_reactions')
      .select('finished_make_id', { count: 'exact', head: true })
      .eq('finished_make_id', makeId)
      .eq('user_id', userData.user.id);
    if (mineError) throw mineError;
    liked = (mineCount ?? 0) > 0;
  }

  return { count: count ?? 0, liked };
}

/**
 * Toggle the current user's like on a finished make.
 * Returns the new state after the toggle.
 */
export async function toggleMakeLike(makeId: string): Promise<MakeLikeState> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');
  const userId = userData.user.id;

  const { count: mineCount, error: mineError } = await supabase
    .from('finished_make_reactions')
    .select('finished_make_id', { count: 'exact', head: true })
    .eq('finished_make_id', makeId)
    .eq('user_id', userId);
  if (mineError) throw mineError;

  if ((mineCount ?? 0) > 0) {
    const { error } = await supabase
      .from('finished_make_reactions')
      .delete()
      .eq('finished_make_id', makeId)
      .eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('finished_make_reactions')
      .insert({ finished_make_id: makeId, user_id: userId });
    if (error) throw error;
  }

  return getMakeLikeState(makeId);
}
