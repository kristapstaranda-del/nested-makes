'use client';

import ProgressBar from '@/components/ui/ProgressBar';
import { getNextMilestone, suggestNextMiniGoal } from '@/lib/gamification';
import { getBadgeCatalogEntry, getLucideIconName } from '@/lib/badgeCatalog';
import * as Icons from 'lucide-react';

export default function NextAchievementCard() {
  const next = getNextMilestone();

  if (!next) {
    return null;
  }

  // Get catalog entry for icon
  const catalogEntry = getBadgeCatalogEntry(next.id);
  const iconName = catalogEntry?.iconName || 'star';
  const iconKey = getLucideIconName(iconName);
  const IconComponent = (Icons as any)[iconKey] || Icons.Star;

  const progressFraction =
    next.progress && next.target ? Math.max(0, Math.min(1, next.progress / next.target)) : 0;

  return (
    <div className="rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border-subtle)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-grow min-w-0">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Next milestone</p>
          <h3 className="text-base font-bold text-[var(--color-text-primary)] mt-1">{next.title}</h3>
          <p className="text-sm text-neutral-600 mt-2">{next.description}</p>

          {next.progress !== undefined && next.target !== undefined && (
            <div className="mt-3">
              <ProgressBar
                value={progressFraction}
                label={`${next.progress} / ${next.target} completed`}
              />
              <p className="mt-2 text-xs text-neutral-500">{suggestNextMiniGoal()}</p>
            </div>
          )}
        </div>

        <div className="flex-shrink-0">
          <div className="w-14 h-14 bg-gradient-to-br from-[var(--color-reward-soft)] to-[var(--color-brand-accent-soft)] rounded-full flex items-center justify-center text-2xl shadow-sm border border-[var(--color-brand-accent)]/20">
            <IconComponent size={28} className="text-[var(--color-text-primary)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
