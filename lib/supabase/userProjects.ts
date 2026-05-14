import { supabase } from '@/lib/supabase/client';
import type { UserProject, ProjectImage } from '@/lib/userProjects';

const BUCKET = 'project-images';

export function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function storagePath(userId: string, projectId: string, imageId: string): string {
  return `${userId}/${projectId}/${imageId}`;
}

function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function uploadImage(path: string, dataUrl: string): Promise<void> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: true,
    contentType: blob.type,
  });
  if (error) throw error;
}

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

export async function getSupabaseUserProjects(userId: string): Promise<UserProject[]> {
  const { data, error } = await supabase
    .from('user_projects')
    .select('*, project_images(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as DbProjectRow[]).map(rowToUserProject);
}

export async function getSupabaseUserProject(id: string, userId: string): Promise<UserProject | null> {
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

export type CreateProjectData = Omit<UserProject, 'id' | 'createdAt' | 'sourceType'>;

export async function createSupabaseUserProject(
  userId: string,
  data: CreateProjectData,
): Promise<UserProject> {
  const projectId = crypto.randomUUID();

  const { error: insertError } = await supabase.from('user_projects').insert({
    id: projectId,
    user_id: userId,
    title: data.title,
    description: data.description || null,
    category: data.category,
    difficulty: data.difficulty ?? null,
    pattern_link: data.patternLink || null,
    notes: data.notes || null,
    is_public: true,
  });
  if (insertError) throw insertError;

  if (data.images && data.images.length > 0) {
    for (let i = 0; i < data.images.length; i++) {
      const img = data.images[i];
      const imageId = crypto.randomUUID();
      const path = storagePath(userId, projectId, imageId);
      await uploadImage(path, img.dataUrl);
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

  const saved = await getSupabaseUserProject(projectId, userId);
  if (!saved) throw new Error('Project not found after create');
  return saved;
}

export async function updateSupabaseUserProject(
  id: string,
  userId: string,
  data: CreateProjectData,
): Promise<UserProject> {
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
    .eq('user_id', userId);
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
      const existingRow = (existingRows ?? []).find((r) => r.storage_path === img.storagePath);
      if (existingRow) {
        await supabase
          .from('project_images')
          .update({ is_cover: img.isCover, sort_order: i })
          .eq('id', existingRow.id);
      }
    } else {
      const imageId = crypto.randomUUID();
      const path = storagePath(userId, id, imageId);
      await uploadImage(path, img.dataUrl);
      await supabase.from('project_images').insert({
        id: imageId,
        project_id: id,
        storage_path: path,
        is_cover: img.isCover,
        sort_order: i,
      });
    }
  }

  const updated = await getSupabaseUserProject(id, userId);
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
