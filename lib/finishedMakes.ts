/**
 * finishedMakes.ts
 *
 * Data model and storage for "I finished this" project completions.
 *
 * Intentionally separate from:
 *   - publicCheckIns  (progress updates, day-to-day)
 *   - archivedChallenges (challenge lifecycle management)
 *   - habitLogs (private habit data)
 *
 * A finished make is a public completion showcase: final photos + optional caption,
 * tied to a project and optionally a challenge.
 *
 * Migration path: replace getStore/saveStore with API calls when auth lands.
 */

import { resolveAuthorId } from './authorResolution';

const STORAGE_KEY = 'finishedMakes';

export interface FinishedMakeImage {
  id: string;
  dataUrl: string; // base64 data URL
  isCover: boolean;
}

export interface FinishedMake {
  id: string;
  projectId: string;
  challengeId?: string;
  authorId: string;    // stable device ID from getOrCreateUserId()
  displayName: string; // from profile at time of submission
  caption?: string;    // optional short completion note
  images: FinishedMakeImage[];
  createdAt: string;   // ISO date string
}

function getStore(): FinishedMake[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStore(makes: FinishedMake[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(makes));
  } catch {}
}

function withResolvedAuthor(makes: FinishedMake[]): FinishedMake[] {
  return makes.map((m) => ({
    ...m,
    authorId: resolveAuthorId(m.authorId as string | undefined, m.displayName) ?? m.authorId,
  }));
}

/** Returns all finished makes, newest first. */
export function getFinishedMakes(): FinishedMake[] {
  return withResolvedAuthor(
    getStore().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  );
}

/** Returns finished makes for a specific project, newest first. */
export function getFinishedMakesForProject(projectId: string): FinishedMake[] {
  return withResolvedAuthor(
    getStore()
      .filter((m) => m.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  );
}

/** Returns finished makes for a specific author, newest first. */
export function getFinishedMakesByAuthor(authorId: string): FinishedMake[] {
  return withResolvedAuthor(
    getStore()
      .filter((m) => m.authorId === authorId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  );
}

/** Returns the cover image data URL for a finished make, or undefined. */
export function getFinishedMakeCoverImage(make: FinishedMake): string | undefined {
  return (
    make.images.find((img) => img.isCover)?.dataUrl ??
    make.images[0]?.dataUrl
  );
}

/** Saves a new finished make and returns it with a generated id and createdAt. */
export function saveFinishedMake(
  data: Omit<FinishedMake, 'id' | 'createdAt'>
): FinishedMake {
  const newMake: FinishedMake = {
    ...data,
    id: `make_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const all = getStore();
  all.push(newMake);
  saveStore(all);
  return newMake;
}
