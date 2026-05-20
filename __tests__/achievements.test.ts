/**
 * Phase 2.4: the achievements module was retired. The legacy test suite has
 * been replaced with a single placeholder so jest still has a file to compile.
 * Replace this with real tests once the new badges feature lands.
 */

// @jest-environment jsdom

import { getAllAchievements, getEarnedAchievements } from '@/lib/achievements';

describe('achievements (Phase 2.4 stub)', () => {
  test('returns empty arrays after retirement', () => {
    expect(getAllAchievements()).toEqual([]);
    expect(getEarnedAchievements()).toEqual([]);
  });
});
