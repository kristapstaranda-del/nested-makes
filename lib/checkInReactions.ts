/**
 * lib/checkInReactions.ts
 *
 * Phase 2.2 — Re-exports the Supabase reaction helpers so existing imports
 * keep working. The localStorage implementation is gone; see
 * lib/supabase/checkInReactions.ts for the current source of truth.
 */

export {
  getReactionState,
  toggleReaction,
  type ReactionState,
} from '@/lib/supabase/checkInReactions';
