/**
 * lib/finishedMakeComments.ts
 *
 * Phase 2.3 — Re-exports the Supabase make-comment helpers so existing
 * imports keep working. See lib/supabase/finishedMakeComments.ts for source.
 *
 * Notable signature changes:
 *   • Now async.
 *   • `saveComment` is renamed to `createComment` and no longer takes
 *     `authorId` / `displayName` — author is derived from the auth session.
 */

export {
  createComment,
  getCommentsForMake,
  getCommentCountsForMakes,
  type FinishedMakeCommentWithAuthor,
  type FinishedMakeCommentWithAuthor as FinishedMakeComment, // legacy alias
} from '@/lib/supabase/finishedMakeComments';
