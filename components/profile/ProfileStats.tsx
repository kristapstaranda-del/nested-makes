import ProgressBar from '@/components/ui/ProgressBar';

interface ProfileStatsProps {
  activeChallengesCount: number;
  archivedChallengesCount: number;
  totalCheckInsCount: number;
  currentStreak: number;
  bestStreak: number;
  last7DaysCount: number;
  last7DaysRate: number;
}

export default function ProfileStats({
  archivedChallengesCount,
  currentStreak,
  last7DaysCount,
  last7DaysRate,
  activeChallengesCount,
  totalCheckInsCount,
  bestStreak,
}: ProfileStatsProps) {
  const hasProgress = activeChallengesCount + archivedChallengesCount + totalCheckInsCount + currentStreak + bestStreak > 0;

  return (
    <div className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Progress snapshot</h3>

      {hasProgress ? (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-2xl font-bold text-[var(--color-brand-primary)]">{currentStreak}</p>
              <p className="text-xs text-[var(--color-text-muted)]">day streak</p>
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold text-[var(--color-brand-primary)]">{archivedChallengesCount}</p>
              <p className="text-xs text-[var(--color-text-muted)]">challenges done</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-medium text-[var(--color-text-secondary)] mb-2">
              <span>Weekly consistency</span>
              <span>{last7DaysRate}%</span>
            </div>
            <ProgressBar value={last7DaysRate / 100} label={`${last7DaysCount} check-ins past 7 days`} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)] italic">Your creative story is just beginning. Add a project or check-in to build momentum.</p>
      )}
    </div>
  );
}
