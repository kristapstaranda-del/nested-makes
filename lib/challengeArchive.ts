/**
 * lib/challengeArchive.ts
 *
 * Phase 2.1 — Thin re-export around the Supabase challenges helper. Kept as a
 * separate module so call sites (`app/makes/new/page.tsx`) don't need to change.
 *
 * The helper is idempotent and silent on failure: it must not break the main
 * finished-make submission flow if archiving fails.
 */

import { archiveChallengeAfterFinish as archiveImpl } from '@/lib/supabase/challenges';

/**
 * Moves a challenge from active → archived after a finished-make submission.
 * Looks up by challengeId first; falls back to projectId if challengeId is absent.
 *
 * Errors are swallowed; in development they are console.warn-ed for debugging.
 */
export function archiveChallengeAfterFinish(opts: {
  challengeId?: string;
  projectId?: string;
}): void {
  archiveImpl(opts).catch((err) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[archiveChallengeAfterFinish] failed silently', err);
    }
  });
}
