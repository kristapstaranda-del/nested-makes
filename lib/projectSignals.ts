/**
 * projectSignals.ts
 *
 * Derives lightweight community signal counts per projectId from localStorage.
 * Falls back to static seed data when localStorage is empty or unavailable.
 *
 * TODO: Replace getProjectSignals() with an API call when a backend exists.
 *       The seed data below is the canonical fallback shape.
 */

export interface ProjectSignals {
  makersCount: number;
  finishedCount: number;
  discussionCount: number;
}

export type ProjectSignalsMap = Record<string, ProjectSignals>;

// ---------------------------------------------------------------------------
// Seed data — replace with API when backend exists
// ---------------------------------------------------------------------------
const SEED_SIGNALS: ProjectSignalsMap = {
  "1": { makersCount: 14, finishedCount: 6,  discussionCount: 22 }, // Cozy Winter Scarf
  "2": { makersCount: 8,  finishedCount: 11, discussionCount: 9  }, // Beaded Bracelet
  "3": { makersCount: 11, finishedCount: 4,  discussionCount: 17 }, // Amigurumi Stuffed Animal
  "4": { makersCount: 3,  finishedCount: 2,  discussionCount: 5  }, // Cable Knit Sweater
  "5": { makersCount: 2,  finishedCount: 1,  discussionCount: 3  }, // Beaded Evening Necklace
  "6": { makersCount: 9,  finishedCount: 5,  discussionCount: 14 }, // Granny Square Afghan
};
// ---------------------------------------------------------------------------

function safeParseArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/**
 * Returns signal counts per projectId.
 * Uses live localStorage data when present; otherwise returns SEED_SIGNALS.
 * Safe to call during SSR — returns seed data on the server.
 */
export function getProjectSignals(): ProjectSignalsMap {
  const active   = safeParseArray<{ projectId?: string }>('activeChallenges');
  const archived = safeParseArray<{ projectId?: string }>('archivedChallenges');
  const checkIns = safeParseArray<{ projectId?: string }>('publicCheckIns');

  const hasAnyData = active.length > 0 || archived.length > 0 || checkIns.length > 0;

  // If localStorage is completely empty, fall back to seed data so the
  // page never looks dead on a fresh install.
  if (!hasAnyData) return SEED_SIGNALS;

  const signals: ProjectSignalsMap = {};

  const inc = (id: string, field: keyof ProjectSignals) => {
    if (!signals[id]) signals[id] = { makersCount: 0, finishedCount: 0, discussionCount: 0 };
    signals[id][field]++;
  };

  active.forEach((c)   => { if (c.projectId) inc(c.projectId, 'makersCount');    });
  archived.forEach((c) => { if (c.projectId) inc(c.projectId, 'finishedCount');  });
  checkIns.forEach((c) => { if (c.projectId) inc(c.projectId, 'discussionCount'); });

  return signals;
}
