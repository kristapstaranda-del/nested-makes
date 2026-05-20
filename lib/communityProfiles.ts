/**
 * lib/communityProfiles.ts
 *
 * Phase 2.4 — Trimmed down to the shared `PublicProfile` types. All mock
 * profiles, seed badges, and localStorage-based current-user lookups have
 * been removed. Community profile data is now sourced from Supabase via
 * `lib/supabase/profiles.ts` and `lib/supabase/finishedMakes.ts` directly.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface PublicCheckInEntry {
  id: string;
  message: string;
  date: string; // YYYY-MM-DD
  displayName: string;
  authorId?: string;
  imageUrl?: string;
}

export interface PublicProjectPreview {
  id: string;
  title: string;
  category: string;
  coverImage?: string;
  description?: string;
}

/**
 * Lightweight badge shape kept here so PublicProfile stays self-contained
 * after the achievements module was retired. A future badges feature can
 * re-introduce a richer type or import from a new module.
 */
export interface PublicBadge {
  id: string;
  title: string;
  emoji: string;
  description?: string;
}

export interface PublicProfile {
  id: string;
  displayName: string;
  about: string;
  craftInterests: string[];
  avatarId?: string;
  avatarColor?: string;
  publicBadges: PublicBadge[];
  recentCheckIns: PublicCheckInEntry[];
  finishedProjects: PublicProjectPreview[];
}
