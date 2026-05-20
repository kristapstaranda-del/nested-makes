/**
 * lib/achievementHelper.ts
 *
 * Phase 2.4: retired alongside the achievements module. Stubbed to keep any
 * lingering imports compiling. Safe to delete once unreferenced.
 */

export interface EarnedAchievementSet {
  ids: Set<string>;
}

export function getEarnedAchievementSnapshot(): EarnedAchievementSet {
  return { ids: new Set() };
}

export function detectUnlockedAchievement(
  _previous: EarnedAchievementSet,
): null {
  return null;
}
