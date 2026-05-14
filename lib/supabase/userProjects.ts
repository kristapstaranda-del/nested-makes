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

function storagePath(userId: string, projectId: string, imageId: string): string {
  // Path format: {userId}/{projectId}/{imageId}.webp
  // First segment MUST equal auth.uid() to pass RLS:
  //   (storage.foldername(name))[1] = auth.uid()::text
  return `${userId}/${projectId}/${imageId}.webp`;
}

function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function uploadImage(
  path: string,
  dataUrl: string,
  authUserId: string,
): Promise<void> {
  const firstFolder = path.split('/')[0];

  if (process.env.NODE_ENV === 'development') {
    console.log('Uploading project image', {
      bucket: BUCKET,
      path,
      firstFolder,
      userId: authUserId,
      firstFolderMatchesUser: firstFolder === authUserId,
    });
  }

  if (firstFolder !== authUserId) {
    throw new Error(
      `Storage path mismatch: first folder "${firstFolder}" does not match auth user "${authUserId}". ` +
        'Upload would be rejected by RLS.',
    );
  }

  const res = await fetch(dataUrl);
  const blob = await res.blob();

  if (process.env.NODE_ENV === 'development') {
    console.log('Uploading project image blob', {
      blobType: blob.type,
      blobSize: blob.size,
    });
  }

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: true,
    contentType: blob.type || 'image/webp',
  });
  if (error) throw error;
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
  // Always use the active Supabase session — never trust the caller-supplied ID
  // for anything that touches Storage paths or DB user_id.
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

  const projectId: string = inserted.id;

  // Upload images using the DB-returned projectId and the verified auth user ID.
  if (data.images && data.images.length > 0) {
    for (let i = 0; i < data.images.length; i++) {
      const img = data.images[i];
      const imageId = crypto.randomUUID();
      const path = storagePath(authUser.id, projectId, imageId);
      await uploadImage(path, img.dataUrl, authUser.id);
      const { error: imgError } = await supabase.from('project_images').insert({
        id: imageId,
        project_id: projectId,
        storage_path: path,
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

  // Delete images that were removed
  const toDelete = (existingRows ?? []).filter((r) => !keptPaths.has(r.storage_path));
  if (toDelete.length > 0) {
    await supabase.storage.from(BUCKET).remove(toDelete.map((r) => r.storage_path));
    await supabase
      .from('project_images')
      .delete()
      .in('id', toDelete.map((r) => r.id));
  }

  // Upsert incoming images
  for (let i = 0; i < incomingImages.length; i++) {
    const img = incomingImages[i];
    if (img.storagePath) {
      // Existing Storage image — update cover flag + sort order only
      const existingRow = (existingRows ?? []).find((r) => r.storage_path === img.storagePath);
      if (existingRow) {
        await supabase
          .from('project_images')
          .update({ is_cover: img.isCover, sort_order: i })
          .eq('id', existingRow.id);
      }
    } else {
      // New base64 image — upload and insert
      const imageId = crypto.randomUUID();
      const path = storagePath(authUser.id, id, imageId);
      await uploadImage(path, img.dataUrl, authUser.id);
      await supabase.from('project_images').insert({
        id: imageId,
        project_id: id,
        storage_path: path,
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

  if (imageRows && imageRows.length > 0) {
    await supabase.storage.from(BUCKET).remove(imageRows.map((r) => r.storage_path));
  }

  await supabase.from('user_projects').delete().eq('id', id).eq('user_id', userId);
}
