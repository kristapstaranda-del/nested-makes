/**
 * finishedMakeComments.ts
 *
 * Flat comment store for finished makes.
 *
 * Storage model:
 *   localStorage key: 'finishedMakeComments'
 *   Shape: FinishedMakeComment[]  — flat array, all comments across all makes
 *
 * Intentionally separate from checkInReplies — finished makes are a distinct
 * content type from progress check-ins.
 *
 * Migration path: replace read/write helpers with API calls when auth lands.
 */

import { resolveAuthorId } from './authorResolution';

const STORAGE_KEY = 'finishedMakeComments';

export interface FinishedMakeComment {
  id: string;
  makeId: string;      // parent finished make
  authorId: string;
  displayName: string;
  message: string;
  createdAt: string;   // ISO timestamp
}

function readAll(): FinishedMakeComment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FinishedMakeComment[]) : [];
  } catch {
    return [];
  }
}

function writeAll(comments: FinishedMakeComment[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
  } catch {}
}

/** Returns all comments for a finished make, oldest-first. */
export function getCommentsForMake(makeId: string): FinishedMakeComment[] {
  return readAll()
    .filter((c) => c.makeId === makeId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((c) => ({
      ...c,
      authorId: resolveAuthorId(c.authorId as string | undefined, c.displayName) ?? c.authorId,
    }));
}

/** Appends a new comment and returns it. */
export function saveComment(
  data: Omit<FinishedMakeComment, 'id' | 'createdAt'>
): FinishedMakeComment {
  const newComment: FinishedMakeComment = {
    ...data,
    id:
      typeof window !== 'undefined' && window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `fmc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  const all = readAll();
  all.push(newComment);
  writeAll(all);
  return newComment;
}
