/**
 * lib/supabase/checkInReplies.ts
 *
 * Phase 2.2 — Supabase-backed replies on check-ins.
 *
 * One-level-only by structure: no parent_reply_id field, so reply-to-reply
 * is impossible at the data layer.
 *
 * Author info is joined from `profiles` at read time (same pattern as
 * lib/supabase/checkIns.ts) so reply display reflects the current profile.
 */

import { supabase } from '@/lib/supabase/client';

// ── Types ────────────────────────────────────────────────────────────────────

interface DbReplyRow {
  id: string;
  check_in_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

/**
 * UI-facing reply shape. Backward compatible with the legacy CheckInReply
 * interface so existing components consume it without changes.
 */
export interface CheckInReplyWithAuthor {
  id: string;
  checkInId: string;
  authorId: string;
  displayName: string;
  message: string;
  createdAt: string;
}

// ── Auth helper ──────────────────────────────────────────────────────────────

async function getAuthUser(): Promise<{ id: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated');
  return data.user;
}

// ── Profile join (batched) ──────────────────────────────────────────────────

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
      console.warn('[checkInReplies] resolveAuthorNames failed', error);
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

function rowToReply(row: DbReplyRow, names: Map<string, string>): CheckInReplyWithAuthor {
  return {
    id: row.id,
    checkInId: row.check_in_id,
    authorId: row.user_id,
    displayName: names.get(row.user_id) ?? 'Maker',
    message: row.message,
    createdAt: row.created_at,
  };
}

// ── Reads ────────────────────────────────────────────────────────────────────

/** Replies for a single check-in, oldest first (thread order). */
export async function getRepliesForCheckIn(
  checkInId: string,
): Promise<CheckInReplyWithAuthor[]> {
  const { data, error } = await supabase
    .from('check_in_replies')
    .select('*')
    .eq('check_in_id', checkInId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  const rows = (data as DbReplyRow[]) ?? [];
  const names = await resolveAuthorNames(rows.map((r) => r.user_id));
  return rows.map((r) => rowToReply(r, names));
}

// ── Write ────────────────────────────────────────────────────────────────────

/** Append a reply to a check-in. Author = current authenticated user. */
export async function createReply(input: {
  checkInId: string;
  message: string;
}): Promise<CheckInReplyWithAuthor> {
  const authUser = await getAuthUser();

  const { data, error } = await supabase
    .from('check_in_replies')
    .insert({
      check_in_id: input.checkInId,
      user_id: authUser.id,
      message: input.message,
    })
    .select('*')
    .single();

  if (error) throw error;

  const names = await resolveAuthorNames([authUser.id]);
  return rowToReply(data as DbReplyRow, names);
}
