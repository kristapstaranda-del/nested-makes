/**
 * authorResolution.ts
 *
 * Shared utilities for resolving authorId on community content loaded from
 * localStorage.
 *
 * WHY THIS EXISTS
 * ---------------
 * All save functions write authorId, but items created during early development
 * (before authorId was consistently stored) may be missing the field. At read
 * time we attempt a name-based backfill so those legacy items still render as
 * clickable author links instead of falling back to plain text.
 *
 * BACKFILL STRATEGY (name-matching is ONLY used for legacy migration)
 * -------------------------------------------------------------------
 * 1. If authorId is already present → return it unchanged.
 * 2. Match displayName against the current device user's saved display name →
 *    return the device's stable hobbyBuddyUserId.
 * 3. Match displayName against seeded mock profile display names → return the
 *    mock profile id.
 * 4. No match → return undefined (AuthorLink gracefully degrades to plain text).
 *
 * The steady-state model is strictly authorId-based; name matching is only
 * a bridge for data that pre-dates the authorId field.
 *
 * Migration path: when auth lands, replace localStorage reads with API calls
 * and drop the name-matching backfill.
 */

import { MOCK_PROFILES } from './communityProfiles';
import { sanitizeCoverImage } from './imageUtils';

// ── Core resolver ────────────────────────────────────────────────────────────

/**
 * Returns a resolved authorId for display/linking purposes.
 *
 * Safe to call at runtime on both server (returns undefined immediately) and
 * client. Never throws.
 */
export function resolveAuthorId(
  authorId: string | undefined | null,
  displayName: string,
): string | undefined {
  // Already has a valid id — pass through unchanged.
  if (authorId) return authorId;

  // Server-side: no localStorage available.
  if (typeof window === 'undefined') return undefined;

  // Legacy backfill: try to match current device user by display name.
  // Checks both the old standalone 'displayName' key and the current 'profileData' name.
  try {
    const currentId = localStorage.getItem('hobbyBuddyUserId');
    if (currentId && displayName) {
      const legacyName = localStorage.getItem('displayName');
      if (legacyName && displayName === legacyName) return currentId;

      const profileRaw = localStorage.getItem('profileData');
      if (profileRaw) {
        const profileData = JSON.parse(profileRaw) as Record<string, unknown>;
        const profileName = typeof profileData.name === 'string' ? profileData.name : null;
        if (profileName && displayName === profileName) return currentId;
      }
    }
  } catch {
    // localStorage unavailable or malformed profileData — silently skip.
  }

  // Legacy backfill: try to match a seeded mock profile by display name.
  const mock = MOCK_PROFILES.find((p) => p.displayName === displayName);
  if (mock) return mock.id;

  return undefined;
}

// ── Shared publicCheckIns reader ─────────────────────────────────────────────

/**
 * The normalised shape of a public check-in entry after loading and resolving.
 * Structurally compatible with the local CheckIn interfaces used in page components.
 */
export interface PublicCheckIn {
  id: string;
  challengeId?: string;
  projectId?: string;
  habitId?: string;
  date: string;       // YYYY-MM-DD
  message: string;
  displayName: string;
  authorId?: string;  // resolved — may still be undefined for unresolvable legacy items
  imageUrl?: string;
}

/**
 * Reads all entries from the 'publicCheckIns' localStorage key, validates
 * basic shape, and applies authorId resolution on each item.
 *
 * Use this everywhere publicCheckIns are consumed so all read sites benefit
 * from the backfill automatically.
 */
export function getPublicCheckIns(): PublicCheckIn[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('publicCheckIns');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (ci): ci is Record<string, unknown> =>
          ci !== null &&
          typeof ci === 'object' &&
          typeof (ci as Record<string, unknown>).message === 'string' &&
          typeof (ci as Record<string, unknown>).date === 'string',
      )
      .map((ci) => {
        const displayName =
          typeof ci.displayName === 'string' ? ci.displayName : 'Anonymous';
        return {
          id: String(ci.id ?? ''),
          challengeId: typeof ci.challengeId === 'string' ? ci.challengeId : undefined,
          projectId: typeof ci.projectId === 'string' ? ci.projectId : undefined,
          habitId: typeof ci.habitId === 'string' ? ci.habitId : undefined,
          date: ci.date as string,
          message: ci.message as string,
          displayName,
          authorId: resolveAuthorId(
            typeof ci.authorId === 'string' ? ci.authorId : undefined,
            displayName,
          ),
          imageUrl: sanitizeCoverImage(
            typeof ci.imageUrl === 'string' ? ci.imageUrl : undefined,
          ),
        };
      });
  } catch {
    return [];
  }
}
