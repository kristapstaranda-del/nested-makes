/**
 * Badge Integration Utility
 * Bridges achievement logic with badge visual metadata
 * Allows UI to easily access both computation and presentation data
 */

import { Achievement } from './achievements';
import { getBadgeCatalogEntry, BadgeCatalogEntry } from './badgeCatalog';

/**
 * Extended achievement with visual catalog metadata
 * Used by UI components to render badges with full context
 */
export interface AchievementWithVisuals extends Achievement {
  visuals?: BadgeCatalogEntry;
}

/**
 * Get achievement with its visual metadata from catalog
 * If catalog entry exists, decorates the achievement with visual data
 * If not found, returns achievement as-is (graceful fallback)
 */
export function enrichAchievementWithVisuals(
  achievement: Achievement
): AchievementWithVisuals {
  const visuals = getBadgeCatalogEntry(achievement.id);
  return {
    ...achievement,
    visuals,
  };
}

/**
 * Get visual metadata for an achievement
 * Safe to call; returns undefined if badge not in catalog
 */
export function getAchievementVisuals(
  badgeId: string
): BadgeCatalogEntry | undefined {
  return getBadgeCatalogEntry(badgeId);
}

/**
 * Get primary visual element (emoji) for a badge
 * Used for quick rendering without full catalog lookup
 */
export function getBadgeEmoji(badgeId: string): string {
  const entry = getBadgeCatalogEntry(badgeId);
  return entry?.emoji ?? '🏅'; // fallback emoji
}

/**
 * Get title from catalog (prefers catalog over achievement title in case of future changes)
 */
export function getBadgeTitle(badgeId: string): string {
  const entry = getBadgeCatalogEntry(badgeId);
  return entry?.title ?? 'Unknown Badge';
}

/**
 * Get description from catalog
 */
export function getBadgeDescription(badgeId: string): string {
  const entry = getBadgeCatalogEntry(badgeId);
  return entry?.description ?? 'A crafted achievement';
}

/**
 * Check if badge is eligible for profile display
 */
export function isBadgeProfileFeaturable(badgeId: string): boolean {
  const entry = getBadgeCatalogEntry(badgeId);
  return entry?.profileFeaturedEligible ?? false;
}

/**
 * Check if badge is eligible for public display
 */
export function isBadgePublicDisplayable(badgeId: string): boolean {
  const entry = getBadgeCatalogEntry(badgeId);
  return entry?.publicDisplayEligible ?? false;
}
