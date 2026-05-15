/**
 * lib/supabase/checkIns.ts
 *
 * Phase 2.2 — Supabase-backed CRUD for the `check_ins` table.
 *
 * Storage convention (matches Phase 1 project-images and Phase 2 RLS):
 *   bucket: check-in-images
 *   path:   {auth.uid}/{challengeId}/{imageId}.{ext}
 *
 * Author identity model:
 *   Each check-in row carries only `user_id`. Author display data (nickname,
 *   avatar_id) is joined from the `profiles` table at read time so an existing
 *   row reflects the current profile state without a backfill step.
 */

import { supabase } from '@/lib/supabase/client';

const BUCKET = 'check-in-images';

// ── Types ────────────────────────────────────────────────────────────────────

interface DbCheckInRow {
  id: string;
  challenge_id: string;
  user_id: string;
  log_date: string;
  message: string;
  image_path: string | null;
  created_at: string;
}

/**
 * UI-facing check-in shape. Backwards compatible with the legacy CheckIn
 * interface used across pages and components so the migration is mostly a
 * find/replace of data source — render code stays unchanged.
 */
export interface CheckInWithAuthor {
  id: string;
  challengeId: string;
  date: string; // YYYY-MM-DD
  message: string;
  imageUrl?: string;
  authorId: string;     // = auth user id
  displayName: string;  // joined from profiles.display_name
  authorAvatarId?: string;
  createdAt: string;
}

// ── Auth helper ──────────────────────────────────────────────────────────────

async function getAuthUser(): Promise<{ id: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated');
  return data.user;
}

// ── Storage helpers ──────────────────────────────────────────────────────────

function getImageExtensionFromMimeType(mimeType: string): string {
  switch (mimeType.toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'webp';
  }
}

function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function uploadCheckInImage(
  authUserId: string,
  challengeId: string,
  imageId: string,
  dataUrl: string,
): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const extension = getImageExtensionFromMimeType(blob.type);
  const contentType = blob.type || 'image/webp';
  const path = `${authUserId}/${challengeId}/${imageId}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: false,
    contentType,
  });

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[checkIns] upload failed', { path, error });
    }
    throw error;
  }

  return path;
}

async function deleteCheckInImage(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]);
}

// ── Profile join (batched) ──────────────────────────────────────────────────

interface AuthorInfo {
  displayName: string;
  authorAvatarId?: string;
}

/**
 * Bulk-fetch profile data for a set of user IDs. Returns a Map keyed by user_id.
 * Falls back to 'Maker' for any user without a profile row.
 */
async function resolveAuthors(userIds: string[]): Promise<Map<string, AuthorInfo>> {
  const map = new Map<string, AuthorInfo>();
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return map;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_id')
    .in('id', unique);

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[checkIns] resolveAuthors failed', error);
    }
    return map;
  }

  for (const row of data ?? []) {
    map.set((row as { id: string }).id, {
      displayName:
        ((row as { display_name: string | null }).display_name ?? '').trim() || 'Maker',
      authorAvatarId:
        (row as { avatar_id: string | null }).avatar_id ?? undefined,
    });
  }
  return map;
}

function rowToCheckIn(
  row: DbCheckInRow,
  authors: Map<string, AuthorInfo>,
): CheckInWithAuthor {
  const author = authors.get(row.user_id) ?? { displayName: 'Maker' };
  return {
    id: row.id,
    challengeId: row.challenge_id,
    date: row.log_date,
    message: row.message,
    imageUrl: row.image_path ? getPublicUrl(row.image_path) : undefined,
    authorId: row.user_id,
    displayName: author.displayName,
    authorAvatarId: author.authorAvatarId,
    createdAt: row.created_at,
  };
}

// ── Reads ────────────────────────────────────────────────────────────────────

/** All check-ins on a single challenge, newest day first. */
export async function getCheckInsForChallenge(
  challengeId: string,
): Promise<CheckInWithAuthor[]> {
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('log_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  const rows = (data as DbCheckInRow[]) ?? [];
  const authors = await resolveAuthors(rows.map((r) => r.user_id));
  return rows.map((r) => rowToCheckIn(r, authors));
}

/**
 * All check-ins for the given user, newest day first. Used on profile and
 * community pages.
 */
export async function getCheckInsForUser(
  userId: string,
  options?: { limit?: number },
): Promise<CheckInWithAuthor[]> {
  let query = supabase
    .from('check_ins')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data as DbCheckInRow[]) ?? [];
  const authors = await resolveAuthors(rows.map((r) => r.user_id));
  return rows.map((r) => rowToCheckIn(r, authors));
}

/** Batch read across many challenges (used by /challenges page). */
export async function getCheckInsForChallenges(
  challengeIds: string[],
): Promise<Record<string, CheckInWithAuthor[]>> {
  const map: Record<string, CheckInWithAuthor[]> = {};
  if (challengeIds.length === 0) return map;

  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .in('challenge_id', challengeIds)
    .order('log_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  const rows = (data as DbCheckInRow[]) ?? [];
  const authors = await resolveAuthors(rows.map((r) => r.user_id));

  for (const row of rows) {
    const ci = rowToCheckIn(row, authors);
    if (!map[ci.challengeId]) map[ci.challengeId] = [];
    map[ci.challengeId].push(ci);
  }
  return map;
}

/**
 * Count of all public check-ins authored by the given user. Cheap dashboard
 * query — uses head:true so no rows transit the wire.
 */
export async function getCheckInCountForUser(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('check_ins')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Count of check-ins authored by the given user in the trailing N days.
 * Used by the home dashboard's "this week" momentum chip.
 */
export async function getRecentCheckInCountForUser(
  userId: string,
  days = 7,
): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const { count, error } = await supabase
    .from('check_ins')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('log_date', cutoffStr);

  if (error) throw error;
  return count ?? 0;
}

/** Per-challenge count for the user — used by the home dashboard preview. */
export async function getCheckInCountsByChallenge(
  userId: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('check_ins')
    .select('challenge_id')
    .eq('user_id', userId);

  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of (data as { challenge_id: string }[]) ?? []) {
    counts[row.challenge_id] = (counts[row.challenge_id] ?? 0) + 1;
  }
  return counts;
}

/** True if the current user already checked in on this challenge today. */
export async function hasCheckInForToday(
  challengeId: string,
  isoDate: string,
): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const { count, error } = await supabase
    .from('check_ins')
    .select('id', { count: 'exact', head: true })
    .eq('challenge_id', challengeId)
    .eq('user_id', userData.user.id)
    .eq('log_date', isoDate);

  if (error) throw error;
  return (count ?? 0) > 0;
}

// ── Write ────────────────────────────────────────────────────────────────────

export interface CreateCheckInInput {
  challengeId: string;
  date: string; // YYYY-MM-DD
  message: string;
  imageDataUrl?: string; // optional base64 data URL
}

/**
 * Insert a new check-in. If imageDataUrl is provided, it is uploaded to the
 * check-in-images bucket first and the storage path is stored on the row.
 *
 * The DB unique constraint (challenge_id, log_date) will reject a second
 * check-in on the same day for the same challenge. UI should call
 * hasCheckInForToday first to render the disabled state.
 */
export async function createCheckIn(
  input: CreateCheckInInput,
): Promise<CheckInWithAuthor> {
  const authUser = await getAuthUser();

  let imagePath: string | null = null;
  if (input.imageDataUrl) {
    const imageId = crypto.randomUUID();
    imagePath = await uploadCheckInImage(
      authUser.id,
      input.challengeId,
      imageId,
      input.imageDataUrl,
    );
  }

  const { data, error } = await supabase
    .from('check_ins')
    .insert({
      challenge_id: input.challengeId,
      user_id: authUser.id,
      log_date: input.date,
      message: input.message,
      image_path: imagePath,
    })
    .select('*')
    .single();

  if (error) {
    // Roll back the uploaded image if the row insert failed (uniqueness etc).
    if (imagePath) {
      try { await deleteCheckInImage(imagePath); } catch {}
    }
    throw error;
  }

  const authors = await resolveAuthors([authUser.id]);
  return rowToCheckIn(data as DbCheckInRow, authors);
}

/**
 * Delete a check-in (owner only, enforced by RLS). Also removes the associated
 * storage object if one exists. Currently not surfaced in the UI, but exposed
 * for completeness and future moderation needs.
 */
export async function deleteCheckIn(checkInId: string): Promise<void> {
  const authUser = await getAuthUser();

  // Read the path first so we can clean up storage after the row is gone.
  const { data: row } = await supabase
    .from('check_ins')
    .select('image_path')
    .eq('id', checkInId)
    .eq('user_id', authUser.id)
    .maybeSingle();

  const { error } = await supabase
    .from('check_ins')
    .delete()
    .eq('id', checkInId)
    .eq('user_id', authUser.id);

  if (error) throw error;

  const imagePath = (row as { image_path: string | null } | null)?.image_path;
  if (imagePath) {
    try { await deleteCheckInImage(imagePath); } catch {}
  }
}
