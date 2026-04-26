/**
 * userProjects.ts
 *
 * Data model and localStorage helpers for user-created projects.
 * Intentionally separate from the static curated projects in app/data/projects.ts.
 *
 * localStorage key: 'userProjects'
 *
 * Left for future blocks:
 *   - coverImage compression (canvas resize before storage)
 *   - tags
 *   - status ('draft' | 'active' | 'completed')
 *   - public visibility flag
 *   - auth/database sync
 */

import { sanitizeCoverImage } from './imageUtils';

/**
 * A single image in a project's image collection (v3+).
 * One image must have isCover: true.
 */
export interface ProjectImage {
  id: string;        // 'img_${Date.now()}_${random}'
  dataUrl: string;   // base64 data URL
  isCover: boolean;
}

/**
 * The normalized shape used by Discover and ProjectCard.
 * Static curated projects already match this shape.
 * User projects are mapped to it via normalizeUserProject().
 */
export interface DiscoverProject {
  id: string;
  title: string;
  craftType: string;
  difficulty: string;
  description: string;
  isUserProject?: boolean;
  coverImage?: string;
}

export interface UserProject {
  id: string;
  title: string;
  description: string;
  category: string;
  patternLink: string;   // optional at the data level — form may treat as optional
  notes: string;
  createdAt: string;     // ISO date string, e.g. "2026-03-25"
  sourceType: 'user';    // distinguishes from static curated projects

  // Fields intentionally left as optional stubs for easy extension
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  coverImage?: string;       // LEGACY v1/v2 — still read on load, not written by v3 forms
  images?: ProjectImage[];   // v3 multi-image collection
  // tags?: string[];
  // status?: 'draft' | 'active' | 'completed';
}

/**
 * Returns the cover image data URL for a project, handling all versions:
 *   v3: uses the images array (first isCover image, or first image as fallback)
 *   v1/v2: falls back to the legacy coverImage field
 * Returns undefined if no valid image exists.
 */
export function getProjectCoverImage(project: UserProject): string | undefined {
  if (project.images && project.images.length > 0) {
    const cover = project.images.find((img) => img.isCover) ?? project.images[0];
    return sanitizeCoverImage(cover.dataUrl);
  }
  return sanitizeCoverImage(project.coverImage);
}

/**
 * Normalizes a UserProject into the DiscoverProject shape so it can be
 * rendered by Discover and ProjectCard without special-casing.
 */
export function normalizeUserProject(p: UserProject): DiscoverProject {
  return {
    id: p.id,
    title: p.title,
    craftType: p.category,
    difficulty: p.difficulty ?? 'Beginner',
    description: p.description,
    isUserProject: true,
    coverImage: getProjectCoverImage(p),
  };
}

const STORAGE_KEY = 'userProjects';

function generateId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Read all user-created projects from localStorage.
 * Returns an empty array if storage is unavailable or data is malformed.
 */
export function getUserProjects(): UserProject[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Accept any object with at least id, title, sourceType === 'user'.
    // Sanitize coverImage (legacy) and images array so corrupted values never reach the UI.
    return parsed
      .filter(
        (p) =>
          typeof p === 'object' &&
          p !== null &&
          typeof p.id === 'string' &&
          typeof p.title === 'string' &&
          p.sourceType === 'user'
      )
      .map((p: any): UserProject => ({
        ...p,
        coverImage: sanitizeCoverImage(p.coverImage),
        images: Array.isArray(p.images)
          ? p.images.filter(
              (img: any) =>
                img &&
                typeof img.id === 'string' &&
                typeof img.isCover === 'boolean' &&
                !!sanitizeCoverImage(img.dataUrl)
            )
          : undefined,
      }));
  } catch {
    return [];
  }
}

/**
 * Save a new user-created project to localStorage.
 * Appends to any existing projects — does not overwrite.
 * Returns the saved project (with generated id and createdAt).
 */
export function saveUserProject(
  data: Omit<UserProject, 'id' | 'createdAt' | 'sourceType'>
): UserProject {
  const project: UserProject = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString().split('T')[0],
    sourceType: 'user',
  };

  const existing = getUserProjects();
  const updated = [...existing, project];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage quota exceeded (QuotaExceededError) or private browsing restrictions.
    // The project object is still returned so the UI can navigate away, but the
    // images (if any) will be lost on next reload. Known MVP limitation.
  }

  return project;
}

/**
 * Update an existing user-created project by id.
 * Preserves id, createdAt, and sourceType. Returns null if the id is not found.
 */
export function updateUserProject(
  id: string,
  data: Omit<UserProject, 'id' | 'createdAt' | 'sourceType'>
): UserProject | null {
  if (typeof window === 'undefined') return null;

  const existing = getUserProjects();
  const idx = existing.findIndex((p) => p.id === id);
  if (idx === -1) return null;

  const updated: UserProject = { ...existing[idx], ...data };
  existing[idx] = updated;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // Ignore storage errors
  }

  return updated;
}

/**
 * Delete a user-created project by id.
 * No-op if the id does not exist.
 */
export function deleteUserProject(id: string): void {
  if (typeof window === 'undefined') return;

  const existing = getUserProjects();
  const updated = existing.filter((p) => p.id !== id);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}
