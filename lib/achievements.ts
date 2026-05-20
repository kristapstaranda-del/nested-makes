/**
 * lib/achievements.ts
 *
 * Phase 2.4: the legacy localStorage-driven achievements catalog has been
 * retired. The badge system will be rebuilt as a separate feature with a
 * proper Supabase-backed model. This file is kept as an empty stub so any
 * straggler imports still compile until they're cleaned up.
 */

export interface Achievement {
  id: string;
  title: string;
  emoji: string;
  description: string;
  earned: boolean;
  progress?: number;
  target?: number;
  category: 'habit' | 'challenge' | 'community' | 'consistency';
  visibility: 'private' | 'profile' | 'public';
  sourceType: 'habit' | 'challenge' | 'community';
}

export function getAllAchievements(): Achievement[] {
  return [];
}

export function getEarnedAchievements(): Achievement[] {
  return [];
}

export function getInProgressAchievements(): Achievement[] {
  return [];
}

export function getFeaturedAchievements(): Achievement[] {
  return [];
}

export function getNextAchievementToUnlock(): Achievement | null {
  return null;
}

export function getAchievementSummary() {
  return { all: [], earned: [], inProgress: [], next: null };
}
