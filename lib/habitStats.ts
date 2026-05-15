/**
 * lib/habitStats.ts
 *
 * Phase 2.1 — Habit statistics backed by Supabase.
 *
 * All helpers are now async. They operate on the current user's active habit
 * (one per user, enforced by the DB partial unique index). Returns 0 when
 * there is no session or no active habit, so call sites don't need to special-
 * case the anonymous state.
 */

import {
  getActiveHabit,
  getHabitLogs,
  type HabitLog,
} from '@/lib/supabase/habits';

async function loadHabitContext(): Promise<{
  habitId: string;
  logs: HabitLog[];
} | null> {
  const habit = await getActiveHabit();
  if (!habit) return null;

  const logs = await getHabitLogs(habit.habitId);
  return { habitId: habit.habitId, logs };
}

/**
 * Current consecutive-done streak ending today (or most recent day).
 * Walks logs newest-first, counting 'done' until a 'missed' breaks the chain.
 */
export async function getCurrentHabitStreak(): Promise<number> {
  const ctx = await loadHabitContext();
  if (!ctx) return 0;

  const sorted = [...ctx.logs].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  );

  let streak = 0;
  for (const log of sorted) {
    if (log.status === 'done') {
      streak++;
    } else if (log.status === 'missed') {
      break;
    }
  }
  return streak;
}

/**
 * Longest consecutive 'done' streak ever recorded for the active habit.
 */
export async function getBestHabitStreak(): Promise<number> {
  const ctx = await loadHabitContext();
  if (!ctx) return 0;

  const sorted = [...ctx.logs].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );

  let current = 0;
  let best = 0;
  for (const log of sorted) {
    if (log.status === 'done') {
      current++;
      if (current > best) best = current;
    } else if (log.status === 'missed') {
      current = 0;
    }
  }
  return best;
}

/**
 * Count of 'done' logs in the trailing 7 days (inclusive of today).
 */
export async function getLast7DaysCompletionCount(): Promise<number> {
  const ctx = await loadHabitContext();
  if (!ctx) return 0;

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  return ctx.logs.filter((log) => {
    if (log.status !== 'done') return false;
    const d = new Date(log.date);
    return d >= sevenDaysAgo && d <= today;
  }).length;
}

/**
 * Percentage (0-100) of done days in the trailing 7 days.
 * Denominator is always 7, not "days with any log", so missing days count
 * against the rate — matches the existing UI behavior.
 */
export async function getLast7DaysCompletionRate(): Promise<number> {
  const completed = await getLast7DaysCompletionCount();
  return Math.round((completed / 7) * 100);
}
