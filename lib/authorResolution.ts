/**
 * lib/authorResolution.ts
 *
 * Phase 2.4 — Reduced to a thin compatibility shim. The legacy localStorage
 * `publicCheckIns` reader was retired in Phase 2.2, and the mock-profile
 * name-matching backfill was retired in Phase 2.4. Author identity now comes
 * straight from Supabase via `user_id` on each row.
 *
 * `resolveAuthorId` is kept as a no-op pass-through so any straggler imports
 * still compile. Safe to delete this file once no consumers remain.
 */

export function resolveAuthorId(
  authorId: string | undefined | null,
  _displayName: string,
): string | undefined {
  return authorId ?? undefined;
}

export interface PublicCheckIn {
  id: string;
  challengeId?: string;
  projectId?: string;
  date: string;
  message: string;
  displayName: string;
  authorId?: string;
  authorAvatarId?: string;
  imageUrl?: string;
}

/**
 * Legacy reader — always returns []. Phase 2.2 moved check-ins to Supabase.
 */
export function getPublicCheckIns(): PublicCheckIn[] {
  return [];
}
