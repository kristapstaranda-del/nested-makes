'use client';

import BadgeDisplay from './BadgeDisplay';
import ProgressBar from '@/components/ui/ProgressBar';
import {
  getProfileBadges,
  getNextMilestone,
  getCurrentProfileTitle,
  getAchievementReasonText,
  suggestNextMiniGoal,
} from '@/lib/gamification';

export default function ProfileAchievements() {
  const badges = getProfileBadges();
  const nextMilestone = getNextMilestone();
  const profileTitle = getCurrentProfileTitle();

  const hasBadges = badges.length > 0;
  const hasNext = nextMilestone !== null;

  if (!hasBadges && !hasNext) return null;

  const featuredBadge = badges[0] ?? null;
  const shownBadges = badges.slice(0, 3);

  return (
    <div className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-5 py-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Achievements</h3>
        {hasBadges && (
          <div className="flex items-center gap-1.5">
            {shownBadges.map((badge) => (
              <BadgeDisplay key={badge.id} achievement={badge} size="small" showLabel={false} />
            ))}
            {badges.length > 3 && (
              <span className="text-xs text-[var(--color-text-muted)]">+{badges.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Featured badge + title */}
      {hasBadges && featuredBadge && (
        <>
          <div className="border-t border-[var(--color-border-subtle)] px-5 py-4 flex items-center gap-4">
            <BadgeDisplay achievement={featuredBadge} size="medium" showLabel={false} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{profileTitle}</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                {getAchievementReasonText(featuredBadge)}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Next milestone */}
      {hasNext && nextMilestone && (
        <div className="border-t border-[var(--color-border-subtle)] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
            Next milestone
          </p>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">{nextMilestone.title}</p>
          <div className="mt-2">
            <ProgressBar
              value={
                nextMilestone.progress !== undefined && nextMilestone.target
                  ? Math.min(nextMilestone.progress / nextMilestone.target, 1)
                  : 0
              }
              label={suggestNextMiniGoal()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
