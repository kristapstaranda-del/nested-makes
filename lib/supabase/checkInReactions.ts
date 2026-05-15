/**
 * lib/supabase/checkInReactions.ts
 *
 * Phase 2.2 — Supabase-backed reactions on check-ins.
 *
 * Storage model in DB:
 *   composite PK (check_in_id, user_id) — one reaction per (check-in, user).
 *   Toggling reduces to insert or delete; no row update path.
 *
 * RLS:
 *   - select: any authenticated user
 *   - insert/delete: auth.uid() = user_id
 */

import { supabase } from '@/lib/supabase/client';

export interface ReactionState {
  count: number;
  liked: boolean;
}

/**
 * Returns the reaction count for a check-in and whether the current user
 * has reacted. Safe to call without a session — `liked` falls back to false.
 */
export async function getReactionState(
  checkInId: string,
): Promise<ReactionState> {
  // Two parallel queries: total count + does my row exist
  const userPromise = supabase.auth.getUser();
  const countPromise = supabase
    .from('check_in_reactions')
    .select('check_in_id', { count: 'exact', head: true })
    .eq('check_in_id', checkInId);

  const [{ data: userData }, { count, error: countError }] = await Promise.all([
    userPromise,
    countPromise,
  ]);

  if (countError) throw countError;

  let liked = false;
  if (userData.user) {
    const { count: mineCount, error: mineError } = await supabase
      .from('check_in_reactions')
      .select('check_in_id', { count: 'exact', head: true })
      .eq('check_in_id', checkInId)
      .eq('user_id', userData.user.id);

    if (mineError) throw mineError;
    liked = (mineCount ?? 0) > 0;
  }

  return { count: count ?? 0, liked };
}

/**
 * Toggle the current user's reaction on a check-in.
 * Returns the new state after the toggle.
 */
export async function toggleReaction(
  checkInId: string,
): Promise<ReactionState> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');
  const userId = userData.user.id;

  // Check current state to decide insert vs delete.
  const { count: mineCount, error: mineError } = await supabase
    .from('check_in_reactions')
    .select('check_in_id', { count: 'exact', head: true })
    .eq('check_in_id', checkInId)
    .eq('user_id', userId);
  if (mineError) throw mineError;

  if ((mineCount ?? 0) > 0) {
    const { error } = await supabase
      .from('check_in_reactions')
      .delete()
      .eq('check_in_id', checkInId)
      .eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('check_in_reactions')
      .insert({ check_in_id: checkInId, user_id: userId });
    if (error) throw error;
  }

  return getReactionState(checkInId);
}
