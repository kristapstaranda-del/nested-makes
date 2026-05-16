/**
 * lib/finishedMakes.ts
 *
 * Phase 2.3 — Re-exports the Supabase finished-make helpers so existing
 * imports keep working. The localStorage implementation is gone; see
 * lib/supabase/finishedMakes.ts for the current source of truth.
 *
 * Notable signature changes from the legacy API:
 *   • All read helpers are now async.
 *   • `saveFinishedMake` is renamed to `createFinishedMake` and no longer
 *     takes `authorId` / `displayName` — the author is derived from the
 *     auth session.
 */

export {
  createFinishedMake,
  getFinishedMakes,
  getFinishedMakesForProject,
  getFinishedMakesByAuthor,
  getFinishedMakeCoverImage,
  getFinishedMakeCountForUser,
  type CreateFinishedMakeInput,
  type FinishedMakeImage,
  type FinishedMakeWithAuthor,
  type FinishedMakeWithAuthor as FinishedMake, // legacy alias
} from '@/lib/supabase/finishedMakes';
