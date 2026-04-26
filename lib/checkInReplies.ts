/**
 * checkInReplies.ts
 *
 * Flat reply store for public challenge check-ins.
 *
 * Storage model:
 *   localStorage key: 'checkInReplies'
 *   Shape: CheckInReply[]  — flat array, all replies across all check-ins
 *
 * One-level-only is enforced structurally: replies link to a checkInId only,
 * not to another replyId. There is no parentReplyId field, making reply-to-reply
 * impossible at the data layer.
 *
 * Migration path: replace read/write helpers with API calls when auth lands.
 */

import { resolveAuthorId } from './authorResolution';

const STORAGE_KEY = 'checkInReplies';

export interface CheckInReply {
  id: string;
  checkInId: string;   // parent check-in — the only nesting link
  authorId: string;
  displayName: string;
  message: string;
  createdAt: string;   // ISO timestamp
}

function readAll(): CheckInReply[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CheckInReply[]) : [];
  } catch {
    return [];
  }
}

function writeAll(replies: CheckInReply[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(replies));
  } catch {}
}

/** Returns all replies for a check-in, oldest-first (chronological thread order). */
export function getRepliesForCheckIn(checkInId: string): CheckInReply[] {
  return readAll()
    .filter((r) => r.checkInId === checkInId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((r) => ({
      ...r,
      authorId: resolveAuthorId(r.authorId as string | undefined, r.displayName) ?? r.authorId,
    }));
}

/** Appends a new reply and returns it. */
export function saveReply(
  data: Omit<CheckInReply, 'id' | 'createdAt'>
): CheckInReply {
  const newReply: CheckInReply = {
    ...data,
    id:
      typeof window !== 'undefined' && window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `reply_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  const all = readAll();
  all.push(newReply);
  writeAll(all);
  return newReply;
}
