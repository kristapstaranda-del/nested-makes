/**
 * Achievement Helper Utilities
 * Detects achievement unlocks and helps select the best feedback to show
 */

import { Achievement, getEarnedAchievements } from './achievements';

/**
 * Represent the state of earned achievements at a point in time
 */
export type EarnedAchievementSet = Set<string>;

/**
 * Get a snapshot of currently earned achievement IDs
 */
export function getEarnedAchievementSnapshot(): EarnedAchievementSet {
  return new Set(getEarnedAchievements().map((a) => a.id));
}

/**
 * Compare two achievement snapshots and return newly unlocked achievements
 * @param beforeSnapshot - Achievements earned before the action
 * @param afterSnapshot - Achievements earned after the action
 * @returns Array of newly unlocked achievements (from after that weren't in before)
 */
export function getNewlyUnlockedAchievements(
  beforeSnapshot: EarnedAchievementSet,
  afterSnapshot: EarnedAchievementSet
): Achievement[] {
  const allEarned = getEarnedAchievements();
  const newIds = Array.from(afterSnapshot).filter((id) => !beforeSnapshot.has(id));
  return allEarned.filter((ach) => newIds.includes(ach.id));
}

/**
 * Select the best achievement to show from a list of newly unlocked achievements
 * Priority: habit streaks > challenges > community
 * If multiple in the same category, pick the first earned
 */
export function selectBestAchievementToShow(
  newlyUnlocked: Achievement[]
): Achievement | null {
  if (newlyUnlocked.length === 0) return null;
  if (newlyUnlocked.length === 1) return newlyUnlocked[0];

  // Priority order for display
  const priorityOrder = [
    'knitting-ninja',
    'streak-keeper',
    'consistency-star',
    'momentum-maker',
    'challenge-finisher',
    'challenge-starter',
    'chatty-crafter',
    'community-spark',
  ];

  // Find the highest priority achievement
  for (const id of priorityOrder) {
    const found = newlyUnlocked.find((ach) => ach.id === id);
    if (found) return found;
  }

  // Fallback: return first
  return newlyUnlocked[0];
}

/**
 * Helper to check if an achievement was just unlocked after an action
 * Returns the best achievement to show, or null if none unlocked
 */
export function detectUnlockedAchievement(
  beforeSnapshot: EarnedAchievementSet
): Achievement | null {
  const afterSnapshot = getEarnedAchievementSnapshot();
  const newlyUnlocked = getNewlyUnlockedAchievements(beforeSnapshot, afterSnapshot);
  return selectBestAchievementToShow(newlyUnlocked);
}
