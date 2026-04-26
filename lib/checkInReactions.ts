/**
 * checkInReactions.ts
 *
 * Lightweight reaction store for public challenge check-ins.
 *
 * Storage model:
 *   localStorage key: 'checkInReactions'
 *   Shape: Record<checkInId, userId[]>
 *
 * The check-in objects in 'publicCheckIns' are intentionally kept immutable —
 * reactions live in a separate key so check-ins never need to be rewritten on toggle.
 *
 * Migration path: replace getStore/saveStore with API calls when auth lands.
 */

const STORAGE_KEY = 'checkInReactions';

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

/** Returns the current reaction count and whether the given user has reacted. */
export function getReactionState(
  checkInId: string,
  userId: string
): { count: number; liked: boolean } {
  const store = getStore();
  const reactors = store[checkInId] ?? [];
  return {
    count: reactors.length,
    liked: reactors.includes(userId),
  };
}

/**
 * Toggles the given user's reaction on a check-in.
 * Returns the new state after the toggle.
 */
export function toggleReaction(
  checkInId: string,
  userId: string
): { count: number; liked: boolean } {
  const store = getStore();
  const reactors = store[checkInId] ?? [];
  const alreadyLiked = reactors.includes(userId);

  store[checkInId] = alreadyLiked
    ? reactors.filter((id) => id !== userId)
    : [...reactors, userId];

  saveStore(store);

  return {
    count: store[checkInId].length,
    liked: !alreadyLiked,
  };
}
