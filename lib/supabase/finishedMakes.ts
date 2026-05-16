/**
 * lib/supabase/finishedMakes.ts
 *
 * Phase 2.3 — Supabase-backed CRUD for finished makes.
 *
 * Two tables work together:
 *   finished_makes        — row per make (caption, project_id, optional challenge_id)
 *   finished_make_images  — N images per make, exactly one is_cover=true
 *
 * Storage:
 *   bucket: make-images
 *   path:   {auth.uid}/{finishedMakeId}/{imageId}.{ext}
 *
 * Author identity is joined from `profiles` at read time so displayName and
 * avatar are always current.
 */

import { supabase } from '@/lib/supabase/client';

const BUCKET = 'make-images';

// ── Types ────────────────────────────────────────────────────────────────────

interface DbMakeRow {
  id: string;
  user_id: string;
  project_id: string;
  challenge_id: string | null;
  caption: string | null;
  created_at: string;
  finished_make_images: {
    id: string;
    storage_path: string;
    is_cover: boolean;
    sort_order: number;
  }[];
}

export interface FinishedMakeImage {
  id: string;
  dataUrl: string;       // public URL (or base64 during creation)
  isCover: boolean;
  storagePath?: string;  // present for persisted images
}

/**
 * UI-facing finished make shape. Backwards compatible with the legacy
 * FinishedMake interface — same field names, same semantics.
 */
export interface FinishedMakeWithAuthor {
  id: string;
  projectId: string;
  challengeId?: string;
  authorId: string;
  displayName: string;
  authorAvatarId?: string;
  caption?: string;
  images: FinishedMakeImage[];
  createdAt: string;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

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

async function uploadMakeImage(
  authUserId: string,
  makeId: string,
  imageId: string,
  dataUrl: string,
): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = getImageExtensionFromMimeType(blob.type);
  const contentType = blob.type || 'image/webp';
  const path = `${authUserId}/${makeId}/${imageId}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: false,
    contentType,
  });
  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[finishedMakes] upload failed', { path, error });
    }
    throw error;
  }
  return path;
}

async function deleteMakeImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await supabase.storage.from(BUCKET).remove(paths);
}

// ── Profile join ─────────────────────────────────────────────────────────────

interface AuthorInfo {
  displayName: string;
  authorAvatarId?: string;
}

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
      console.warn('[finishedMakes] resolveAuthors failed', error);
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

function rowToFinishedMake(
  row: DbMakeRow,
  authors: Map<string, AuthorInfo>,
): FinishedMakeWithAuthor {
  const author = authors.get(row.user_id) ?? { displayName: 'Maker' };
  const images = (row.finished_make_images ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => ({
      id: img.id,
      dataUrl: getPublicUrl(img.storage_path),
      isCover: img.is_cover,
      storagePath: img.storage_path,
    }));

  return {
    id: row.id,
    projectId: row.project_id,
    challengeId: row.challenge_id ?? undefined,
    authorId: row.user_id,
    displayName: author.displayName,
    authorAvatarId: author.authorAvatarId,
    caption: row.caption ?? undefined,
    images,
    createdAt: row.created_at,
  };
}

// ── Reads ────────────────────────────────────────────────────────────────────

/** All finished makes, newest first. */
export async function getFinishedMakes(): Promise<FinishedMakeWithAuthor[]> {
  const { data, error } = await supabase
    .from('finished_makes')
    .select('*, finished_make_images(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  const rows = (data as DbMakeRow[]) ?? [];
  const authors = await resolveAuthors(rows.map((r) => r.user_id));
  return rows.map((r) => rowToFinishedMake(r, authors));
}

/** Finished makes for a specific project, newest first. */
export async function getFinishedMakesForProject(
  projectId: string,
): Promise<FinishedMakeWithAuthor[]> {
  const { data, error } = await supabase
    .from('finished_makes')
    .select('*, finished_make_images(*)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const rows = (data as DbMakeRow[]) ?? [];
  const authors = await resolveAuthors(rows.map((r) => r.user_id));
  return rows.map((r) => rowToFinishedMake(r, authors));
}

/** Finished makes authored by a specific user, newest first. */
export async function getFinishedMakesByAuthor(
  userId: string,
): Promise<FinishedMakeWithAuthor[]> {
  const { data, error } = await supabase
    .from('finished_makes')
    .select('*, finished_make_images(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const rows = (data as DbMakeRow[]) ?? [];
  const authors = await resolveAuthors(rows.map((r) => r.user_id));
  return rows.map((r) => rowToFinishedMake(r, authors));
}

/** Returns the cover image URL for a finished make, or undefined. */
export function getFinishedMakeCoverImage(make: FinishedMakeWithAuthor): string | undefined {
  return make.images.find((img) => img.isCover)?.dataUrl ?? make.images[0]?.dataUrl;
}

/** Count of finished makes for a user (for profile stats). */
export async function getFinishedMakeCountForUser(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('finished_makes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw error;
  return count ?? 0;
}

// ── Write ────────────────────────────────────────────────────────────────────

export interface CreateFinishedMakeInput {
  projectId: string;
  challengeId?: string;
  caption?: string;
  images: Array<{ dataUrl: string; isCover: boolean }>;
}

/**
 * Insert a new finished make with N images.
 *
 * Two-phase: (1) insert finished_makes row → DB generates UUID; (2) upload
 * each image to the bucket using that UUID, then insert finished_make_images.
 * If image upload or row insert fails after the make is created, the
 * already-uploaded files are cleaned up but the make row stays — UI will
 * still show it with whatever images succeeded, and the user can retry.
 */
export async function createFinishedMake(
  input: CreateFinishedMakeInput,
): Promise<FinishedMakeWithAuthor> {
  const authUser = await getAuthUser();

  if (input.images.length === 0) {
    throw new Error('A finished make needs at least one photo.');
  }

  // 1) Insert finished_makes row to get a UUID.
  const { data: inserted, error: insertError } = await supabase
    .from('finished_makes')
    .insert({
      user_id: authUser.id,
      project_id: input.projectId,
      challenge_id: input.challengeId ?? null,
      caption: input.caption ?? null,
    })
    .select('id')
    .single();

  if (insertError) throw insertError;
  const makeId: string = inserted.id;

  // 2) Upload images sequentially. Track uploaded paths so we can clean up
  //    if a later step fails.
  const uploadedPaths: string[] = [];
  try {
    for (let i = 0; i < input.images.length; i++) {
      const img = input.images[i];
      const imageId = crypto.randomUUID();
      const storagePath = await uploadMakeImage(
        authUser.id,
        makeId,
        imageId,
        img.dataUrl,
      );
      uploadedPaths.push(storagePath);

      const { error: imgError } = await supabase.from('finished_make_images').insert({
        id: imageId,
        finished_make_id: makeId,
        storage_path: storagePath,
        is_cover: img.isCover,
        sort_order: i,
      });
      if (imgError) throw imgError;
    }
  } catch (e) {
    // Best-effort rollback for storage objects. The DB row remains so the
    // caller can decide how to surface the partial failure.
    try { await deleteMakeImages(uploadedPaths); } catch {}
    throw e;
  }

  // 3) Refetch the joined row.
  const { data, error } = await supabase
    .from('finished_makes')
    .select('*, finished_make_images(*)')
    .eq('id', makeId)
    .single();
  if (error) throw error;

  const authors = await resolveAuthors([authUser.id]);
  return rowToFinishedMake(data as DbMakeRow, authors);
}

/**
 * Delete a finished make and all its images (DB cascade + Storage cleanup).
 * Not surfaced in UI yet but exposed for future moderation/owner-delete.
 */
export async function deleteFinishedMake(makeId: string): Promise<void> {
  const authUser = await getAuthUser();

  const { data: images } = await supabase
    .from('finished_make_images')
    .select('storage_path')
    .eq('finished_make_id', makeId);

  const { error } = await supabase
    .from('finished_makes')
    .delete()
    .eq('id', makeId)
    .eq('user_id', authUser.id);
  if (error) throw error;

  const paths = (images as { storage_path: string }[] | null)?.map((r) => r.storage_path) ?? [];
  if (paths.length > 0) {
    try { await deleteMakeImages(paths); } catch {}
  }
}
