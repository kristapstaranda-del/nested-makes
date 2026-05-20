import { supabase } from '@/lib/supabase/client';
import type { UserProject, ProjectImage } from '@/lib/userProjects';

const BUCKET = 'project-images';

export function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// ── Auth helper ──────────────────────────────────────────────────────────────

async function getAuthUser(): Promise<{ id: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated');
  return data.user;
}

// ── Storage helpers ──────────────────────────────────────────────────────────

export function getImageExtensionFromMimeType(mimeType: string): string {
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

/**
 * Converts a base64 data URL to a Blob, uploads it to Storage, and returns
 * the final storage path (including MIME-derived extension).
 *
 * Path format: {authUserId}/{projectId}/{imageId}.{ext}
 * The first segment MUST equal auth.uid() to satisfy RLS:
 *   (storage.foldername(name))[1] = auth.uid()::text
 */
async function uploadImageAndGetPath(
  authUserId: string,
  projectId: string,
  imageId: string,
  dataUrl: string,
): Promise<string> {
  // Convert data URL → Blob (preserves MIME type from the data URL header)
  const res = await fetch(dataUrl);
  const blob = await res.blob();

  const extension = getImageExtensionFromMimeType(blob.type);
  const contentType = blob.type || 'image/webp';
  const path = `${authUserId}/${projectId}/${imageId}.${extension}`;
  const firstFolder = path.split('/')[0];

  if (process.env.NODE_ENV === 'development') {
    console.log('[Storage] uploadImageAndGetPath', {
      bucket: BUCKET,
      path,
      firstFolder,
      userId: authUserId,
      firstFolderMatchesUser: firstFolder === authUserId,
      blobType: blob.type,
      blobSize: blob.size,
      extension,
      contentType,
      isBlob: blob instanceof Blob,
      isFormData: false,
    });
  }

  if (firstFolder !== authUserId) {
    throw new Error(
      `[Storage] Path mismatch: first folder "${firstFolder}" ≠ auth user "${authUserId}". ` +
        'Upload would fail RLS.',
    );
  }

  // Pass the Blob directly — Supabase SDK handles the HTTP encoding internally.
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: false,
    contentType,
  });

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Storage] Upload failed', { path, blobType: blob.type, error });
    }
    throw error;
  }

  return path;
}

async function deleteStorageImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await supabase.storage.from(BUCKET).remove(paths);
}

// ── DB row shape ─────────────────────────────────────────────────────────────

interface DbProjectRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty: string | null;
  pattern_link: string | null;
  notes: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  project_images: {
    id: string;
    storage_path: string;
    is_cover: boolean;
    sort_order: number;
  }[];
}

function rowToUserProject(row: DbProjectRow): UserProject {
  const images: ProjectImage[] = (row.project_images ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => ({
      id: img.id,
      dataUrl: getPublicUrl(img.storage_path),
      storagePath: img.storage_path,
      isCover: img.is_cover,
    }));

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    category: row.category,
    difficulty: (row.difficulty as UserProject['difficulty']) ?? undefined,
    patternLink: row.pattern_link ?? '',
    notes: row.notes ?? '',
    createdAt: row.created_at.split('T')[0],
    sourceType: 'user',
    images: images.length > 0 ? images : undefined,
  };
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getSupabaseUserProjects(userId: string): Promise<UserProject[]> {
  const { data, error } = await supabase
    .from('user_projects')
    .select('*, project_images(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as DbProjectRow[]).map(rowToUserProject);
}

/**
 * Fetch every public project across all users — used by /discover after the
 * static mock library was removed in Phase 2.4. RLS on user_projects allows
 * `is_public = true` rows to be visible to any authenticated user.
 */
export async function getAllPublicUserProjects(): Promise<UserProject[]> {
  const { data, error } = await supabase
    .from('user_projects')
    .select('*, project_images(*)')
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as DbProjectRow[]).map(rowToUserProject);
}

/**
 * Fetch a single project by id (any user, as long as it's public OR owned by
 * the caller — RLS handles the visibility filter). Used by pages that need a
 * project's title/category but don't know which user it belongs to.
 */
export async function getSupabasePublicUserProject(
  id: string,
): Promise<UserProject | null> {
  const { data, error } = await supabase
    .from('user_projects')
    .select('*, project_images(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return rowToUserProject(data as DbProjectRow);
}

export async function getSupabaseUserProject(
  id: string,
  userId: string,
): Promise<UserProject | null> {
  const { data, error } = await supabase
    .from('user_projects')
    .select('*, project_images(*)')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return rowToUserProject(data as DbProjectRow);
}

// ── Write ─────────────────────────────────────────────────────────────────────

export type CreateProjectData = Omit<UserProject, 'id' | 'createdAt' | 'sourceType'>;

export async function createSupabaseUserProject(
  _callerUserId: string,
  data: CreateProjectData,
): Promise<UserProject> {
  // Always derive the user ID from the live Supabase session.
  const authUser = await getAuthUser();

  // Insert project row; let the DB generate the UUID so projectId is authoritative.
  const { data: inserted, error: insertError } = await supabase
    .from('user_projects')
    .insert({
      user_id: authUser.id,
      title: data.title,
      description: data.description || null,
      category: data.category,
      difficulty: data.difficulty ?? null,
      pattern_link: data.patternLink || null,
      notes: data.notes || null,
      is_public: true,
    })
    .select('id')
    .single();
  if (insertError) throw insertError;

  // projectId is now the UUID that exists in the DB.
  const projectId: string = inserted.id;

  if (data.images && data.images.length > 0) {
    for (let i = 0; i < data.images.length; i++) {
      const img = data.images[i];
      const imageId = crypto.randomUUID();

      // uploadImageAndGetPath converts dataUrl → Blob, derives extension, builds path, uploads.
      const storagePath = await uploadImageAndGetPath(
        authUser.id,
        projectId,
        imageId,
        img.dataUrl,
      );

      const { error: imgError } = await supabase.from('project_images').insert({
        id: imageId,
        project_id: projectId,
        storage_path: storagePath,
        is_cover: img.isCover,
        sort_order: i,
      });
      if (imgError) throw imgError;
    }
  }

  const saved = await getSupabaseUserProject(projectId, authUser.id);
  if (!saved) throw new Error('Project not found after create');
  return saved;
}

export async function updateSupabaseUserProject(
  id: string,
  _callerUserId: string,
  data: CreateProjectData,
): Promise<UserProject> {
  const authUser = await getAuthUser();

  const { error: updateError } = await supabase
    .from('user_projects')
    .update({
      title: data.title,
      description: data.description || null,
      category: data.category,
      difficulty: data.difficulty ?? null,
      pattern_link: data.patternLink || null,
      notes: data.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', authUser.id);
  if (updateError) throw updateError;

  const { data: existingRows, error: fetchError } = await supabase
    .from('project_images')
    .select('id, storage_path, is_cover, sort_order')
    .eq('project_id', id)
    .order('sort_order');
  if (fetchError) throw fetchError;

  const incomingImages = data.images ?? [];
  const keptPaths = new Set(
    incomingImages.filter((img) => img.storagePath).map((img) => img.storagePath as string),
  );

  // Remove Storage objects + DB rows for images the user deleted.
  const toDelete = (existingRows ?? []).filter((r) => !keptPaths.has(r.storage_path));
  await deleteStorageImages(toDelete.map((r) => r.storage_path));
  if (toDelete.length > 0) {
    await supabase
      .from('project_images')
      .delete()
      .in('id', toDelete.map((r) => r.id));
  }

  // Upsert incoming images.
  for (let i = 0; i < incomingImages.length; i++) {
    const img = incomingImages[i];
    if (img.storagePath) {
      // Existing Storage image — update metadata only.
      const existingRow = (existingRows ?? []).find((r) => r.storage_path === img.storagePath);
      if (existingRow) {
        await supabase
          .from('project_images')
          .update({ is_cover: img.isCover, sort_order: i })
          .eq('id', existingRow.id);
      }
    } else {
      // New base64 image — upload and insert.
      const imageId = crypto.randomUUID();
      const storagePath = await uploadImageAndGetPath(authUser.id, id, imageId, img.dataUrl);
      await supabase.from('project_images').insert({
        id: imageId,
        project_id: id,
        storage_path: storagePath,
        is_cover: img.isCover,
        sort_order: i,
      });
    }
  }

  const updated = await getSupabaseUserProject(id, authUser.id);
  if (!updated) throw new Error('Project not found after update');
  return updated;
}

export async function deleteSupabaseUserProject(id: string, userId: string): Promise<void> {
  const { data: imageRows } = await supabase
    .from('project_images')
    .select('storage_path')
    .eq('project_id', id);

  await deleteStorageImages((imageRows ?? []).map((r) => r.storage_path));
  await supabase.from('user_projects').delete().eq('id', id).eq('user_id', userId);
}
