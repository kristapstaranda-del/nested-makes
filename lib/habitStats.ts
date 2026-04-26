interface HabitLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  status: 'done' | 'missed';
}

function getHabitLogs(): HabitLog[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem('habitLogs');
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (log) =>
          typeof log === 'object' &&
          log !== null &&
          typeof log.id === 'string' &&
          typeof log.habitId === 'string' &&
          typeof log.date === 'string' &&
          (log.status === 'done' || log.status === 'missed')
      ) as HabitLog[];
    }
  } catch (error) {
    // Ignore malformed data
  }

  return [];
}

function getActiveHabitId(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem('activeHabit');
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.habitId === 'string'
    ) {
      return parsed.habitId;
    }
  } catch (error) {
    // Ignore malformed data
  }

  return null;
}

export function getCurrentHabitStreak(): number {
  const habitId = getActiveHabitId();
  if (!habitId) return 0;

  const logs = getHabitLogs()
    .filter((log) => log.habitId === habitId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let streak = 0;
  const today = new Date().toISOString().split('T')[0];

  for (const log of logs) {
    if (log.status === 'done') {
      streak++;
    } else if (log.status === 'missed') {
      break;
    }
  }

  return streak;
}

export function getBestHabitStreak(): number {
  const habitId = getActiveHabitId();
  if (!habitId) return 0;

  const logs = getHabitLogs()
    .filter((log) => log.habitId === habitId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let currentStreak = 0;
  let bestStreak = 0;

  for (const log of logs) {
    if (log.status === 'done') {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else if (log.status === 'missed') {
      currentStreak = 0;
    }
  }

  return bestStreak;
}

export function getLast7DaysCompletionCount(): number {
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

export function getLast7DaysCompletionRate(): number {
  const habitId = getActiveHabitId();
  if (!habitId) return 0;

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const relevantLogs = getHabitLogs()
    .filter((log) => log.habitId === habitId)
    .filter((log) => {
      const logDate = new Date(log.date);
      return logDate >= sevenDaysAgo && logDate <= today;
    });

  const totalDays = 7;
  const completedDays = relevantLogs.filter((log) => log.status === 'done').length;

  return totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
}