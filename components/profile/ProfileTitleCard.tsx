'use client';

import {
  getCurrentProfileTitle,
  getCurrentProfileTitleEmoji,
  getAchievementReasonText,
} from '@/lib/gamification';
import { getEarnedAchievements } from '@/lib/achievements';
import { getBadgeCatalogEntry, getLucideIconName } from '@/lib/badgeCatalog';
import * as Icons from 'lucide-react';

export default function ProfileTitleCard() {
  const title = getCurrentProfileTitle();
  const emoji = getCurrentProfileTitleEmoji();
  const achieved = getEarnedAchievements();

  // Find the achievement that matches the current title
  const titleAchievement = achieved.find((ach) => ach.title === title);

  // Get catalog entry for icon
  const catalogEntry = titleAchievement ? getBadgeCatalogEntry(titleAchievement.id) : null;
  const iconName = catalogEntry?.iconName || 'star';
  const iconKey = getLucideIconName(iconName);
  const IconComponent = (Icons as any)[iconKey] || Icons.Star;

  return (
    <div className="rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border-subtle)] p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <div className="w-14 h-14 bg-[var(--color-brand-primary-soft)] rounded-xl flex items-center justify-center text-2xl shadow-sm border border-[var(--color-brand-primary)]/20">
            <IconComponent size={28} className="text-[var(--color-text-primary)]" />
          </div>
        </div>

        <div className="flex-grow min-w-0">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Creative title</p>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] truncate">{title}</h2>
          {titleAchievement && (
            <p className="text-xs text-neutral-600 mt-1 line-clamp-2">
              {getAchievementReasonText(titleAchievement)}
            </p>
          )}
        </div>
      </div>
      <p className="mt-3 text-sm text-neutral-600">
        This title reflects what you’ve built so far. Carry it forward as your craft story evolves.
      </p>
    </div>
  );
}
