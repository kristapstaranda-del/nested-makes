/**
 * challengeArchive.ts
 *
 * Pure localStorage utility for archiving a challenge after a finished-make submission.
 * No React, no confirm dialog, no feedback calls — those are the caller's responsibility.
 *
 * Idempotent: safe to call even if the challenge is already archived or not found.
 */

/**
 * Moves a challenge from activeChallenges → archivedChallenges.
 * Looks up by challengeId first; falls back to projectId if challengeId is absent.
 * Does nothing if the challenge is not found in active, or is already in archived.
 */
export function archiveChallengeAfterFinish(opts: {
  challengeId?: string;
  projectId?: string;
}): void {
  if (typeof window === 'undefined') return;
  const { challengeId, projectId } = opts;
  if (!challengeId && !projectId) return;

  try {
    // ── Read active challenges ────────────────────────────────────────────────
    const activeRaw = localStorage.getItem('activeChallenges');
    if (!activeRaw) return;
    const active: any[] = JSON.parse(activeRaw) || [];
    if (!Array.isArray(active)) return;

    // Find the challenge
    const idx = active.findIndex((c) =>
      challengeId
        ? c.challengeId === challengeId
        : c.projectId === projectId
    );
    if (idx === -1) return; // not in active, nothing to do

    const [removed] = active.splice(idx, 1);
    localStorage.setItem('activeChallenges', JSON.stringify(active));

    // ── Move to archivedChallenges (duplicate-safe) ──────────────────────────
    const archivedRaw = localStorage.getItem('archivedChallenges');
    const archived: any[] = archivedRaw
      ? (JSON.parse(archivedRaw) || [])
      : [];

    const alreadyArchived =
      Array.isArray(archived) &&
      archived.some((c) => c.challengeId === removed.challengeId);

    if (!alreadyArchived) {
      archived.push(removed);
      localStorage.setItem('archivedChallenges', JSON.stringify(archived));
    }
  } catch {
    // Silent — localStorage errors must not break the main submission flow
  }
}
