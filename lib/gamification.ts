/**
 * Gamification Layer
 * High-level functions that determine what to show on the profile
 * Uses achievements.ts to compute earned/in-progress achievements
 */

import {
  getAllAchievements,
  getEarnedAchievements,
  getFeaturedAchievements,
  getNextAchievementToUnlock,
  Achievement,
} from './achievements';

/**
 * Determine the current profile title based on earned achievements
 * Priority order (highest to lowest):
 * 1. Knitting Ninja (highest skill tier)
 * 2. Chatty Crafter (high community engagement)
 * 3. Challenge Finisher (challenge completion)
 * 4. Momentum Maker (combined activity)
 * 5. Challenge Starter (beginner entry)
 * 6. Consistency Star (beginner entrypoint)
 * 7. Streak Keeper (beginner entry)
 * 8. Community Spark (community entry)
 * 9. Default fallback
 */
export function getCurrentProfileTitle(): string {
  const earned = getEarnedAchievements();

  // Define priority order for title
  const titlePriority = [
    'knitting-ninja',
    'chatty-crafter',
    'challenge-finisher',
    'momentum-maker',
    'challenge-starter',
    'consistency-star',
    'streak-keeper',
    'community-spark',
  ];

  for (const id of titlePriority) {
    const achievement = earned.find((ach) => ach.id === id);
    if (achievement) {
      return achievement.title;
    }
  }

  // Fallback for new users with no achievements yet
  return 'Curious Crafter';
}

/**
 * Get the emoji for the current profile title
 */
export function getCurrentProfileTitleEmoji(): string {
  const achieved = getEarnedAchievements();

  const titlePriority = [
    'knitting-ninja',
    'chatty-crafter',
    'challenge-finisher',
    'momentum-maker',
    'challenge-starter',
    'consistency-star',
    'streak-keeper',
    'community-spark',
  ];

  for (const id of titlePriority) {
    const achievement = achieved.find((ach) => ach.id === id);
    if (achievement) {
      return achievement.emoji;
    }
  }

  return '🎨'; // Default emoji for Curious Crafter
}

/**
 * Show Few: Get featured achieved badges (max 3)
 * These are the achievements to highlight on the profile
 */
export function getProfileBadges(): Achievement[] {
  return getFeaturedAchievements();
}

/**
 * Highlight One: Get the next achievement the user should aim for
 * This creates a sense of progression
 */
export function getNextMilestone(): Achievement | null {
  return getNextAchievementToUnlock();
}

/**
 * Get friendly description for why an achievement is earned
 * Used to explain achievements on the profile
 */
export function getAchievementReasonText(achievement: Achievement): string {
  const reasons: { [key: string]: string } = {
    'streak-keeper': 'Your habit is on fire! You have a 3-day streak going.',
    'knitting-ninja': 'Wow! You have hit a 7-day habit streak. Legendary!',
    'consistency-star': 'You completed 5 out of 7 days this week. Consistent!',
    'challenge-starter': 'You have joined your first challenge. Let us go!',
    'challenge-finisher': 'You completed a challenge! That is awesome.',
    'momentum-maker': 'You are balancing habits and challenges perfectly.',
    'community-spark': 'You shared your first check-in. Welcome to the community!',
    'chatty-crafter': 'You are an active community member with 3+ check-ins.',
  };

  return reasons[achievement.id] || achievement.description;
}

/**
 * Get suggested next mini-achievement (for showing mini-progress)
 * This motivates users by showing what's next
 */
export function suggestNextMiniGoal(): string {
  const next = getNextMilestone();

  if (!next) {
    return 'You have earned all major achievements! Keep going!';
  }

  if (next.progress === undefined || next.target === undefined) {
    return `Unlock: ${next.title}`;
  }

  const remaining = next.target - next.progress;
  if (remaining <= 0) {
    return 'Almost there!';
  }

  return `${remaining} more ${remaining === 1 ? 'day' : 'days'} to go`;
}

/**
 * Compute overall "achievement health" 0-100 for a subtle indicator
 * Not a gamification leaderboard, just user's personal progress feeling
 */
export function getAchievementHealthScore(): number {
  const all = getAllAchievements();
  const earned = getEarnedAchievements();

  if (all.length === 0) return 0;

  // Give more weight to harder achievements
  const maxScore = 100;
  const earnedPercentage = (earned.length / all.length) * maxScore;

  // Cap at a reasonable level so users don't feel forced to chase everything
  return Math.min(earnedPercentage, 85);
}

/**
 * Determine if user should see any achievement content at all
 * Even on first visit, show encouragement but don't overwhelm
 */
export function shouldShowAchievements(): boolean {
  // Always show (even on first visit) to introduce the concept gently
  return true;
}
