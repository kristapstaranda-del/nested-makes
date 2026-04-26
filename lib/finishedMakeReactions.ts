/**
 * finishedMakeReactions.ts
 *
 * Lightweight like store for finished makes.
 *
 * Storage model:
 *   localStorage key: 'finishedMakeReactions'
 *   Shape: Record<makeId, userId[]>
 *
 * Kept intentionally separate from checkInReactions — finished makes are a
 * distinct content type from progress check-ins and must not share reaction data.
 *
 * Migration path: replace getStore/saveStore with API calls when auth lands.
 */

const STORAGE_KEY = 'finishedMakeReactions';

type ReactionsStore = Record<string, string[]>;

function getStore(): ReactionsStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    // Normalize: ensure every entry is a string[] (guard against legacy data shapes).
    const normalized: ReactionsStore = {};
    for (const [key, val] of Object.entries(parsed)) {
      normalized[key] = Array.isArray(val) ? (val as string[]) : [];
    }
    return normalized;
  } catch {
    return {};
  }
}

function saveStore(store: ReactionsStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

/** Returns the current like count and whether the given user has liked this make. */
export function getMakeLikeState(
  makeId: string,
  userId: string
): { count: number; liked: boolean } {
  const store = getStore();
  const likers = store[makeId] ?? [];
  return {
    count: likers.length,
    liked: likers.includes(userId),
  };
}

/**
 * Toggles the given user's like on a finished make.
 * Returns the new state after the toggle.
 */
export function toggleMakeLike(
  makeId: string,
  userId: string
): { count: number; liked: boolean } {
  const store = getStore();
  const likers = store[makeId] ?? [];
  const alreadyLiked = likers.includes(userId);

  store[makeId] = alreadyLiked
    ? likers.filter((id) => id !== userId)
    : [...likers, userId];

  saveStore(store);

  return {
    count: store[makeId].length,
    liked: !alreadyLiked,
  };
}
