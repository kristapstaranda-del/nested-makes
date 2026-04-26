/**
 * Achievement System Unit Tests
 * Tests for achievements.ts and gamification.ts
 */

// @jest-environment jsdom

import {
  getAllAchievements,
  getEarnedAchievements,
  getInProgressAchievements,
  getFeaturedAchievements,
  getNextAchievementToUnlock,
} from '@/lib/achievements';
import {
  getCurrentProfileTitle,
  getCurrentProfileTitleEmoji,
  getProfileBadges,
} from '@/lib/gamification';

// Helper: Clear localStorage before each test
beforeEach(() => {
  localStorage.clear();
});

// ============================================================================
// STREAK & HABIT ACHIEVEMENTS
// ============================================================================

describe('Streak Keeper Achievement (3-day streak)', () => {
  it('should earn when user has exactly 3 consecutive "done" logs', () => {
    const today = new Date();
    const logs = [
      {
        id: '1',
        habitId: 'habit-1',
        date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'done',
      },
      {
        id: '2',
        habitId: 'habit-1',
        date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'done',
      },
      {
        id: '3',
        habitId: 'habit-1',
        date: today.toISOString().split('T')[0],
        status: 'done',
      },
    ];

    localStorage.setItem('habitLogs', JSON.stringify(logs));
    localStorage.setItem('activeHabit', JSON.stringify({ habitId: 'habit-1' }));

    const earned = getEarnedAchievements();
    const streakKeeperEarned = earned.some((ach) => ach.id === 'streak-keeper');

    expect(streakKeeperEarned).toBe(true);
  });

  it('should not earn with only 2-day streak', () => {
    const today = new Date();
    const logs = [
      {
        id: '1',
        habitId: 'habit-1',
        date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'done',
      },
      {
        id: '2',
        habitId: 'habit-1',
        date: today.toISOString().split('T')[0],
        status: 'done',
      },
    ];

    localStorage.setItem('habitLogs', JSON.stringify(logs));
    localStorage.setItem('activeHabit', JSON.stringify({ habitId: 'habit-1' }));

    const earned = getEarnedAchievements();
    const streakKeeperEarned = earned.some((ach) => ach.id === 'streak-keeper');

    expect(streakKeeperEarned).toBe(false);
  });

  it('should show progress when streak is 1 or 2 days', () => {
    const today = new Date();
    const logs = [
      {
        id: '1',
        habitId: 'habit-1',
        date: today.toISOString().split('T')[0],
        status: 'done',
      },
    ];

    localStorage.setItem('habitLogs', JSON.stringify(logs));
    localStorage.setItem('activeHabit', JSON.stringify({ habitId: 'habit-1' }));

    const inProgress = getInProgressAchievements();
    const streakKeeperProgress = inProgress.find(
      (ach) => ach.id === 'streak-keeper'
    );

    expect(streakKeeperProgress?.progress).toBe(1);
    expect(streakKeeperProgress?.target).toBe(3);
  });
});

describe('Knitting Ninja Achievement (7-day streak)', () => {
  it('should earn when user has 7 consecutive "done" days', () => {
    const today = new Date();
    const logs = [];

    for (let i = 6; i >= 0; i--) {
      logs.push({
        id: String(i),
        habitId: 'habit-1',
        date: new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'done' as const,
      });
    }

    localStorage.setItem('habitLogs', JSON.stringify(logs));
    localStorage.setItem('activeHabit', JSON.stringify({ habitId: 'habit-1' }));

    const earned = getEarnedAchievements();
    const ninjaEarned = earned.some((ach) => ach.id === 'knitting-ninja');

    expect(ninjaEarned).toBe(true);
  });

  it('should not earn with 6-day streak', () => {
    const today = new Date();
    const logs = [];

    for (let i = 5; i >= 0; i--) {
      logs.push({
        id: String(i),
        habitId: 'habit-1',
        date: new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'done' as const,
      });
    }

    localStorage.setItem('habitLogs', JSON.stringify(logs));
    localStorage.setItem('activeHabit', JSON.stringify({ habitId: 'habit-1' }));

    const earned = getEarnedAchievements();
    const ninjaEarned = earned.some((ach) => ach.id === 'knitting-ninja');

    expect(ninjaEarned).toBe(false);
  });

  it('should break streak on first "missed" day', () => {
    const today = new Date();
    const logs = [
      {
        id: '1',
        habitId: 'habit-1',
        date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'missed' as const,
      },
      {
        id: '2',
        habitId: 'habit-1',
        date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'done' as const,
      },
      {
        id: '3',
        habitId: 'habit-1',
        date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'done' as const,
      },
      {
        id: '4',
        habitId: 'habit-1',
        date: today.toISOString().split('T')[0],
        status: 'done' as const,
      },
    ];

    localStorage.setItem('habitLogs', JSON.stringify(logs));
    localStorage.setItem('activeHabit', JSON.stringify({ habitId: 'habit-1' }));

    const earned = getEarnedAchievements();
    const streakKeeperEarned = earned.some((ach) => ach.id === 'streak-keeper');

    // Current streak is 3 (missed breaks it), so streak keeper should be earned
    expect(streakKeeperEarned).toBe(true);
  });
});

describe('Consistency Star Achievement (5 of 7 days)', () => {
  it('should earn when user completed 5 out of last 7 days', () => {
    const today = new Date();
    const logs = [];

    // 5 done, 2 missed in last 7 days
    const statuses = ['done', 'done', 'missed', 'done', 'done', 'missed', 'done'];

    for (let i = 6; i >= 0; i--) {
      logs.push({
        id: String(i),
        habitId: 'habit-1',
        date: new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: statuses[6 - i] as 'done' | 'missed',
      });
    }

    localStorage.setItem('habitLogs', JSON.stringify(logs));
    localStorage.setItem('activeHabit', JSON.stringify({ habitId: 'habit-1' }));

    const earned = getEarnedAchievements();
    const starEarned = earned.some((ach) => ach.id === 'consistency-star');

    expect(starEarned).toBe(true);
  });

  it('should not earn with only 4 out of 7 completions', () => {
    const today = new Date();
    const logs = [];

    // 4 done, 3 missed in last 7 days
    const statuses = ['done', 'done', 'missed', 'done', 'missed', 'missed', 'done'];

    for (let i = 6; i >= 0; i--) {
      logs.push({
        id: String(i),
        habitId: 'habit-1',
        date: new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: statuses[6 - i] as 'done' | 'missed',
      });
    }

    localStorage.setItem('habitLogs', JSON.stringify(logs));
    localStorage.setItem('activeHabit', JSON.stringify({ habitId: 'habit-1' }));

    const earned = getEarnedAchievements();
    const starEarned = earned.some((ach) => ach.id === 'consistency-star');

    expect(starEarned).toBe(false);
  });
});

// ============================================================================
// CHALLENGE ACHIEVEMENTS
// ============================================================================

describe('Challenge Starter Achievement (1 active challenge)', () => {
  it('should earn when user has at least 1 active challenge', () => {
    const challenges = [
      {
        challengeId: 'ch-1',
        projectId: 'proj-1',
        plan: {},
        createdAt: '2024-01-01',
      },
    ];

    localStorage.setItem('activeChallenges', JSON.stringify(challenges));

    const earned = getEarnedAchievements();
    const starterEarned = earned.some((ach) => ach.id === 'challenge-starter');

    expect(starterEarned).toBe(true);
  });

  it('should not earn with zero active challenges', () => {
    localStorage.setItem('activeChallenges', JSON.stringify([]));

    const earned = getEarnedAchievements();
    const starterEarned = earned.some((ach) => ach.id === 'challenge-starter');

    expect(starterEarned).toBe(false);
  });
});

describe('Challenge Finisher Achievement (1 archived challenge)', () => {
  it('should earn when user has at least 1 archived challenge', () => {
    const challenges = [
      {
        challengeId: 'ch-1',
        projectId: 'proj-1',
        plan: {},
        createdAt: '2024-01-01',
      },
    ];

    localStorage.setItem('archivedChallenges', JSON.stringify(challenges));

    const earned = getEarnedAchievements();
    const finisherEarned = earned.some((ach) => ach.id === 'challenge-finisher');

    expect(finisherEarned).toBe(true);
  });

  it('should not earn with zero archived challenges', () => {
    localStorage.setItem('archivedChallenges', JSON.stringify([]));

    const earned = getEarnedAchievements();
    const finisherEarned = earned.some((ach) => ach.id === 'challenge-finisher');

    expect(finisherEarned).toBe(false);
  });
});

describe('Momentum Maker Achievement (active habit + active challenge)', () => {
  it('should earn when user has both active habit and active challenge', () => {
    localStorage.setItem('activeHabit', JSON.stringify({ habitId: 'habit-1' }));
    localStorage.setItem(
      'activeChallenges',
      JSON.stringify([
        {
          challengeId: 'ch-1',
          projectId: 'proj-1',
          plan: {},
          createdAt: '2024-01-01',
        },
      ])
    );

    const earned = getEarnedAchievements();
    const makerEarned = earned.some((ach) => ach.id === 'momentum-maker');

    expect(makerEarned).toBe(true);
  });

  it('should not earn with only habit but no challenge', () => {
    localStorage.setItem('activeHabit', JSON.stringify({ habitId: 'habit-1' }));
    localStorage.setItem('activeChallenges', JSON.stringify([]));

    const earned = getEarnedAchievements();
    const makerEarned = earned.some((ach) => ach.id === 'momentum-maker');

    expect(makerEarned).toBe(false);
  });

  it('should not earn with only challenge but no habit', () => {
    localStorage.setItem('activeChallenges', JSON.stringify([
      {
        challengeId: 'ch-1',
        projectId: 'proj-1',
        plan: {},
        createdAt: '2024-01-01',
      },
    ]));

    const earned = getEarnedAchievements();
    const makerEarned = earned.some((ach) => ach.id === 'momentum-maker');

    expect(makerEarned).toBe(false);
  });
});

// ============================================================================
// COMMUNITY ACHIEVEMENTS
// ============================================================================

describe('Community Spark Achievement (1 public check-in)', () => {
  it('should earn when user has at least 1 public check-in', () => {
    const checkIns = [
      {
        id: 'checkin-1',
        challengeId: 'ch-1',
        date: '2024-01-01',
        message: 'Hello',
        displayName: 'User',
      },
    ];

    localStorage.setItem('publicCheckIns', JSON.stringify(checkIns));

    const earned = getEarnedAchievements();
    const sparkEarned = earned.some((ach) => ach.id === 'community-spark');

    expect(sparkEarned).toBe(true);
  });

  it('should not earn with zero public check-ins', () => {
    localStorage.setItem('publicCheckIns', JSON.stringify([]));

    const earned = getEarnedAchievements();
    const sparkEarned = earned.some((ach) => ach.id === 'community-spark');

    expect(sparkEarned).toBe(false);
  });
});

describe('Chatty Crafter Achievement (3 public check-ins)', () => {
  it('should earn when user has at least 3 public check-ins', () => {
    const checkIns = [
      {
        id: 'checkin-1',
        challengeId: 'ch-1',
        date: '2024-01-01',
        message: 'Hello 1',
        displayName: 'User',
      },
      {
        id: 'checkin-2',
        challengeId: 'ch-2',
        date: '2024-01-02',
        message: 'Hello 2',
        displayName: 'User',
      },
      {
        id: 'checkin-3',
        challengeId: 'ch-3',
        date: '2024-01-03',
        message: 'Hello 3',
        displayName: 'User',
      },
    ];

    localStorage.setItem('publicCheckIns', JSON.stringify(checkIns));

    const earned = getEarnedAchievements();
    const crafterEarned = earned.some((ach) => ach.id === 'chatty-crafter');

    expect(crafterEarned).toBe(true);
  });

  it('should not earn with only 2 public check-ins', () => {
    const checkIns = [
      {
        id: 'checkin-1',
        challengeId: 'ch-1',
        date: '2024-01-01',
        message: 'Hello 1',
        displayName: 'User',
      },
      {
        id: 'checkin-2',
        challengeId: 'ch-2',
        date: '2024-01-02',
        message: 'Hello 2',
        displayName: 'User',
      },
    ];

    localStorage.setItem('publicCheckIns', JSON.stringify(checkIns));

    const earned = getEarnedAchievements();
    const crafterEarned = earned.some((ach) => ach.id === 'chatty-crafter');

    expect(crafterEarned).toBe(false);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  it('should handle empty localStorage gracefully', () => {
    localStorage.clear();

    const all = getAllAchievements();
    const earned = getEarnedAchievements();

    expect(all.length).toBeGreaterThan(0);
    expect(earned.length).toBe(0);
  });

  it('should handle malformed habitLogs JSON', () => {
    localStorage.setItem('habitLogs', 'INVALID JSON {]');
    localStorage.setItem('activeHabit', JSON.stringify({ habitId: 'habit-1' }));

    const earned = getEarnedAchievements();

    // Should not crash and should return valid achievements
    expect(earned.length).toBe(0);
  });

  it('should handle malformed activeChallenges JSON', () => {
    localStorage.setItem('activeChallenges', 'INVALID JSON {]');

    const earned = getEarnedAchievements();

    // Should not crash
    expect(earned).toBeDefined();
  });

  it('should handle multiple badges earned at once', () => {
    const today = new Date();
    const logs = [];

    // Generate 7-day streak
    for (let i = 6; i >= 0; i--) {
      logs.push({
        id: String(i),
        habitId: 'habit-1',
        date: new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'done' as const,
      });
    }

    localStorage.setItem('habitLogs', JSON.stringify(logs));
    localStorage.setItem('activeHabit', JSON.stringify({ habitId: 'habit-1' }));
    localStorage.setItem('activeChallenges', JSON.stringify([
      {
        challengeId: 'ch-1',
        projectId: 'proj-1',
        plan: {},
        createdAt: '2024-01-01',
      },
    ]));
    localStorage.setItem('publicCheckIns', JSON.stringify([
      {
        id: 'checkin-1',
        challengeId: 'ch-1',
        date: '2024-01-01',
        message: 'Hello',
        displayName: 'User',
      },
    ]));

    const earned = getEarnedAchievements();

    // Should have multiple badges
    expect(earned.length).toBeGreaterThanOrEqual(4);

    // Verify specific ones
    const ids = earned.map((ach) => ach.id);
    expect(ids).toContain('knitting-ninja');
    expect(ids).toContain('streak-keeper');
    expect(ids).toContain('consistency-star');
    expect(ids).toContain('challenge-starter');
    expect(ids).toContain('momentum-maker');
    expect(ids).toContain('community-spark');
  });
});

// ============================================================================
// GAMIFICATION LAYER: TITLE PRIORITY
// ============================================================================

describe('Title Priority Order', () => {
  it('should prioritize Knitting Ninja highest', () => {
    const today = new Date();
    const logs = [];

    for (let i = 6; i >= 0; i--) {
      logs.push({
        id: String(i),
        habitId: 'habit-1',
        date: new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'done' as const,
      });
    }

    localStorage.setItem('habitLogs', JSON.stringify(logs));
    localStorage.setItem('activeHabit', JSON.stringify({ habitId: 'habit-1' }));
    localStorage.setItem('publicCheckIns', JSON.stringify([
      {
        id: 'checkin-1',
        challengeId: 'ch-1',
        date: '2024-01-01',
        message: 'Hello',
        displayName: 'User',
      },
    ]));

    const title = getCurrentProfileTitle();
    expect(title).toBe('Knitting Ninja');
  });

  it('should use Chatty Crafter over lower priority badges', () => {
    localStorage.setItem('publicCheckIns', JSON.stringify([
      {
        id: 'checkin-1',
        date: '2024-01-01',
        message: 'Hello 1',
        displayName: 'User',
      },
      {
        id: 'checkin-2',
        date: '2024-01-02',
        message: 'Hello 2',
        displayName: 'User',
      },
      {
        id: 'checkin-3',
        date: '2024-01-03',
        message: 'Hello 3',
        displayName: 'User',
      },
    ]));
    localStorage.setItem('activeChallenges', JSON.stringify([
      {
        challengeId: 'ch-1',
        projectId: 'proj-1',
        plan: {},
        createdAt: '2024-01-01',
      },
    ]));

    const title = getCurrentProfileTitle();
    expect(title).toBe('Chatty Crafter');
  });

  it('should return default title when no achievements earned', () => {
    localStorage.clear();

    const title = getCurrentProfileTitle();
    expect(title).toBe('Curious Crafter');
  });

  it('should provide emoji for current title', () => {
    const today = new Date();
    const logs = [];

    for (let i = 6; i >= 0; i--) {
      logs.push({
        id: String(i),
        habitId: 'habit-1',
        date: new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'done' as const,
      });
    }

    localStorage.setItem('habitLogs', JSON.stringify(logs));
    localStorage.setItem('activeHabit', JSON.stringify({ habitId: 'habit-1' }));

    const emoji = getCurrentProfileTitleEmoji();
    expect(emoji).toBe('🥋'); // Knitting Ninja
  });
});

// ============================================================================
// FEATURED BADGES (Show Few)
// ============================================================================

describe('Featured Badges (Show Few)', () => {
  it('should return max 3 featured badges', () => {
    // Create scenario with 6+ badges earned
    const today = new Date();
    const logs = [];

    for (let i = 6; i >= 0; i--) {
      logs.push({
        id: String(i),
        habitId: 'habit-1',
        date: new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'done' as const,
      });
    }

    localStorage.setItem('habitLogs', JSON.stringify(logs));
    localStorage.setItem('activeHabit', JSON.stringify({ habitId: 'habit-1' }));
    localStorage.setItem('activeChallenges', JSON.stringify([
      {
        challengeId: 'ch-1',
        projectId: 'proj-1',
        plan: {},
        createdAt: '2024-01-01',
      },
    ]));
    localStorage.setItem('archivedChallenges', JSON.stringify([
      {
        challengeId: 'ch-2',
        projectId: 'proj-2',
        plan: {},
        createdAt: '2024-01-02',
      },
    ]));
    localStorage.setItem('publicCheckIns', JSON.stringify([
      {
        id: 'checkin-1',
        date: '2024-01-01',
        message: 'Hello 1',
        displayName: 'User',
      },
      {
        id: 'checkin-2',
        date: '2024-01-02',
        message: 'Hello 2',
        displayName: 'User',
      },
      {
        id: 'checkin-3',
        date: '2024-01-03',
        message: 'Hello 3',
        displayName: 'User',
      },
    ]));

    const featured = getProfileBadges();
    expect(featured.length).toBeLessThanOrEqual(3);
    expect(featured.length).toBeGreaterThan(0);
  });

  it('should prioritize habit streaks in featured badges', () => {
    const today = new Date();
    const logs = [];

    for (let i = 6; i >= 0; i--) {
      logs.push({
        id: String(i),
        habitId: 'habit-1',
        date: new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'done' as const,
      });
    }

    localStorage.setItem('habitLogs', JSON.stringify(logs));
    localStorage.setItem('activeHabit', JSON.stringify({ habitId: 'habit-1' }));

    const featured = getProfileBadges();
    const firstBadgeId = featured[0]?.id;

    // First featured should be a habit-related achievement
    expect(['knitting-ninja', 'streak-keeper', 'consistency-star']).toContain(
      firstBadgeId
    );
  });
});
