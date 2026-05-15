/**
 * lib/checkInReplies.ts
 *
 * Phase 2.2 — Re-exports the Supabase reply helpers so existing imports
 * keep working. The localStorage implementation is gone; see
 * lib/supabase/checkInReplies.ts for the current source of truth.
 *
 * Note: `saveReply` is renamed to `createReply` and now takes only
 * { checkInId, message } — author is derived from the auth session. Callers
 * that used the old signature must be updated.
 */

export {
  createReply,
  getRepliesForCheckIn,
  type CheckInReplyWithAuthor,
  type CheckInReplyWithAuthor as CheckInReply, // legacy alias
} from '@/lib/supabase/checkInReplies';
