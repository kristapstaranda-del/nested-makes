/**
 * Achievements System for HobbyBuddy
 * Safely computes achievements from localStorage data without crashing on first visit
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

interface HabitLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  status: 'done' | 'missed';
}

interface ActiveChallenge {
  challengeId: string;
  projectId: string;
  plan: any;
  createdAt: string;
}

interface CheckIn {
  id: string;
  challengeId?: string;
  projectId?: string;
  habitId?: string;
  date: string;
  message: string;
  displayName: string;
}

/**
 * Safely parse localStorage data without crashing
 */
function safeGetFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;

  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    return JSON.parse(stored) as T;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Get all habit logs safely
 */
function getHabitLogs(): HabitLog[] {
  const logs = safeGetFromStorage<any[]>('habitLogs', []);
  return logs.filter(
    (log) =>
      typeof log === 'object' &&
      log !== null &&
      typeof log.id === 'string' &&
      typeof log.habitId === 'string' &&
      typeof log.date === 'string' &&
      (log.status === 'done' || log.status === 'missed')
  ) as HabitLog[];
}

/**
 * Get active habit ID safely
 */
function getActiveHabitId(): string | null {
  const habit = safeGetFromStorage<any>('activeHabit', null);
  if (
    typeof habit === 'object' &&
    habit !== null &&
    typeof habit.habitId === 'string'
  ) {
    return habit.habitId;
  }
  return null;
}

/**
 * Get all active challenges safely
 */
function getActiveChallenges(): ActiveChallenge[] {
  const challenges = safeGetFromStorage<any[]>('activeChallenges', []);
  return challenges.filter(
    (ch) =>
      typeof ch === 'object' &&
      ch !== null &&
      typeof ch.challengeId === 'string'
  ) as ActiveChallenge[];
}

/**
 * Get all archived challenges safely
 */
function getArchivedChallenges(): ActiveChallenge[] {
  const challenges = safeGetFromStorage<any[]>('archivedChallenges', []);
  return challenges.filter(
    (ch) =>
      typeof ch === 'object' &&
      ch !== null &&
      typeof ch.challengeId === 'string'
  ) as ActiveChallenge[];
}

/**
 * Get all public check-ins safely
 */
function getPublicCheckIns(): CheckIn[] {
  const checkIns = safeGetFromStorage<any[]>('publicCheckIns', []);
  return checkIns.filter(
    (ch) =>
      typeof ch === 'object' &&
      ch !== null &&
      typeof ch.id === 'string'
  ) as CheckIn[];
}

/**
 * Calculate current habit streak
 */
function getCurrentHabitStreak(): number {
  const habitId = getActiveHabitId();
  if (!habitId) return 0;

  const logs = getHabitLogs()
    .filter((log) => log.habitId === habitId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let streak = 0;
  for (const log of logs) {
    if (log.status === 'done') {
      streak++;
    } else if (log.status === 'missed') {
      break;
    }
  }

  return streak;
}

/**
 * Calculate completion count for last 7 days
 */
function getLast7DaysCompletionCount(): number {
  const habitId = getActiveHabitId();
  if (!habitId) return 0;

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  return getHabitLogs()
    .filter((log) => log.habitId === habitId && log.status === 'done')
    .filter((log) => {
      const logDate = new Date(log.date);
      return logDate >= sevenDaysAgo && logDate <= today;
    }).length;
}

/**
 * Check if user has an active habit with today's log marked done
 */
function hasTodayHabitCompletion(): boolean {
  const habitId = getActiveHabitId();
  if (!habitId) return false;

  const today = new Date().toISOString().split('T')[0];
  const logs = getHabitLogs();
  const todayLog = logs.find(
    (log) => log.habitId === habitId && log.date === today
  );

  return todayLog?.status === 'done';
}

/**
 * Define all achievements (compute earnings at runtime)
 */
function defineAllAchievements(): Achievement[] {
  const habitId = getActiveHabitId();
  const currentStreak = getCurrentHabitStreak();
  const last7DaysCount = getLast7DaysCompletionCount();
  const activeChallenges = getActiveChallenges();
  const archivedChallenges = getArchivedChallenges();
  const publicCheckIns = getPublicCheckIns();

  return [
    // HABIT ACHIEVEMENTS (Private)
    {
      id: 'streak-keeper',
      title: 'Streak Keeper',
      emoji: '🔥',
      description: 'Maintain a 3-day habit streak',
      earned: currentStreak >= 3,
      progress: currentStreak,
      target: 3,
      category: 'habit',
      visibility: 'private',
      sourceType: 'habit',
    },
    {
      id: 'knitting-ninja',
      title: 'Knitting Ninja',
      emoji: '🥋',
      description: 'Reach a 7-day habit streak',
      earned: currentStreak >= 7,
      progress: currentStreak,
      target: 7,
      category: 'habit',
      visibility: 'private',
      sourceType: 'habit',
    },
    {
      id: 'consistency-star',
      title: 'Consistency Star',
      emoji: '⭐',
      description: 'Complete 5 out of 7 days this week',
      earned: last7DaysCount >= 5,
      progress: last7DaysCount,
      target: 7,
      category: 'consistency',
      visibility: 'private',
      sourceType: 'habit',
    },

    // CHALLENGE ACHIEVEMENTS (Profile)
    {
      id: 'challenge-starter',
      title: 'Challenge Starter',
      emoji: '🚀',
      description: 'Join your first active challenge',
      earned: activeChallenges.length >= 1,
      progress: activeChallenges.length,
      target: 1,
      category: 'challenge',
      visibility: 'profile',
      sourceType: 'challenge',
    },
    {
      id: 'challenge-finisher',
      title: 'Challenge Finisher',
      emoji: '✨',
      description: 'Complete and archive a challenge',
      earned: archivedChallenges.length >= 1,
      progress: archivedChallenges.length,
      target: 1,
      category: 'challenge',
      visibility: 'profile',
      sourceType: 'challenge',
    },
    {
      id: 'momentum-maker',
      title: 'Momentum Maker',
      emoji: '💫',
      description: 'Have an active habit and challenge going',
      earned: !!habitId && activeChallenges.length >= 1,
      category: 'challenge',
      visibility: 'profile',
      sourceType: 'challenge',
    },

    // COMMUNITY ACHIEVEMENTS (Public/Profile)
    {
      id: 'community-spark',
      title: 'Community Spark',
      emoji: '✨',
      description: 'Share your first public check-in',
      earned: publicCheckIns.length >= 1,
      progress: publicCheckIns.length,
      target: 1,
      category: 'community',
      visibility: 'public',
      sourceType: 'community',
    },
    {
      id: 'chatty-crafter',
      title: 'Chatty Crafter',
      emoji: '💬',
      description: 'Share 3 public check-ins',
      earned: publicCheckIns.length >= 3,
      progress: publicCheckIns.length,
      target: 3,
      category: 'community',
      visibility: 'public',
      sourceType: 'community',
    },

    // FUTURE EXTENSIBLE ACHIEVEMENT
    {
      id: 'daily-committer',
      title: 'Daily Committer',
      emoji: '📅',
      description: 'Check in daily for 14 days',
      earned: false, // Placeholder for future extension
      category: 'consistency',
      visibility: 'private',
      sourceType: 'habit',
    },
  ];
}

/**
 * Get all achievements with current earned status
 */
export function getAllAchievements(): Achievement[] {
  return defineAllAchievements();
}

/**
 * Get only earned achievements
 */
export function getEarnedAchievements(): Achievement[] {
  return defineAllAchievements().filter((ach) => ach.earned);
}

/**
 * Get only in-progress achievements (not yet earned)
 */
export function getInProgressAchievements(): Achievement[] {
  return defineAllAchievements().filter(
    (ach) => !ach.earned && ach.progress !== undefined
  );
}

/**
 * Get featured achievements for profile display
 * Returns up to 3 most interesting earned achievements
 * Priority: habit streaks, then challenges, then community
 */
export function getFeaturedAchievements(): Achievement[] {
  const earned = getEarnedAchievements();

  // Priority order: habit streaks > challenges > community
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

  const sorted = earned.sort((a, b) => {
    const aIndex = priorityOrder.indexOf(a.id);
    const bIndex = priorityOrder.indexOf(b.id);
    return aIndex - bIndex;
  });

  return sorted.slice(0, 3);
}

/**
 * Get the next achievement most likely to unlock
 * Prioritizes achievements that are closest to completion
 */
export function getNextAchievementToUnlock(): Achievement | null {
  const inProgress = getInProgressAchievements();

  if (inProgress.length === 0) {
    // If all earned, suggest the next tier
    const allAchievements = getAllAchievements();
    // Find first not-yet-started that has meaningful progression
    return (
      allAchievements.find(
        (ach) => !ach.earned && ach.target && ach.progress === 0
      ) || null
    );
  }

  // Sort by progress percentage (closest to target first)
  inProgress.sort((a, b) => {
    const aPercent = a.progress && a.target ? a.progress / a.target : 0;
    const bPercent = b.progress && b.target ? b.progress / b.target : 0;
    return bPercent - aPercent;
  });

  return inProgress[0] || null;
}

/**
 * Get a summary of achievements for quick reference
 */
export function getAchievementSummary() {
  const all = getAllAchievements();
  const earned = getEarnedAchievements();
  const inProgress = getInProgressAchievements();
  const next = getNextAchievementToUnlock();

  return {
    totalCount: all.length,
    earnedCount: earned.length,
    inProgressCount: inProgress.length,
    nextToUnlock: next,
  };
}

/**
 * Get only achievements visible on profile (private or public/profile)
 * Exclude community/public badges that might later appear on usernames
 */
export function getProfileVisibleAchievements(): Achievement[] {
  return getAllAchievements().filter(
    (ach) => ach.visibility === 'private' || ach.visibility === 'profile'
  );
}
