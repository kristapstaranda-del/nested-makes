/**
 * lib/finishedMakeReactions.ts
 *
 * Phase 2.3 — Re-exports the Supabase make-like helpers so existing imports
 * keep working. See lib/supabase/finishedMakeReactions.ts for the source.
 *
 * Notable signature changes:
 *   • Now async.
 *   • `userId` is no longer passed in — derived from the auth session.
 */

export {
  getMakeLikeState,
  toggleMakeLike,
  type MakeLikeState,
} from '@/lib/supabase/finishedMakeReactions';
