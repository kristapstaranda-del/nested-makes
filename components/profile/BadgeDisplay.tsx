'use client';

import type { CSSProperties } from 'react';
import { Achievement } from '@/lib/achievements';
import { getBadgeCatalogEntry, getAccentToneCssVariable, getLucideIconName } from '@/lib/badgeCatalog';
import * as Icons from 'lucide-react';

interface BadgeDisplayProps {
  achievement: Achievement;
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

/**
 * Build rarity-aware circle classes and inline styles.
 *
 * Visual hierarchy (quiet → expressive):
 *  common     — flat, subtle border, 80 % opacity  (clearly entry-level)
 *  meaningful — flat, 2 px border, full opacity     (slightly richer)
 *  milestone  — warm gradient + reward border, shadow-md (collectible feel)
 *  special    — warm gradient + reward border + outer ring on medium (most rewarding)
 *
 * The outer ring on special badges is applied only to the `medium` size to
 * avoid clipping issues inside compact `overflow-hidden` containers (e.g. the
 * ProfileAchievements header row).
 */
function getRarityCircleStyle(
  rarity: string,
  accentVar: string,
  size: 'small' | 'medium'
): { classes: string; style: CSSProperties } {
  switch (rarity) {
    case 'special':
      return {
        classes: 'border-2 shadow-md',
        style: {
          background: `linear-gradient(135deg, var(--color-reward-soft) 0%, ${accentVar} 100%)`,
          borderColor: 'var(--color-reward-primary)',
          // Outer halo ring — only when there is room for it to breathe
          ...(size === 'medium' && {
            outline: '3px solid rgba(225, 169, 58, 0.22)',
            outlineOffset: '2px',
          }),
        },
      };
    case 'milestone':
      return {
        classes: 'border-2 shadow-md',
        style: {
          background: `linear-gradient(135deg, var(--color-reward-soft) 0%, ${accentVar} 100%)`,
          borderColor: 'var(--color-reward-primary)',
        },
      };
    case 'meaningful':
      return {
        classes: 'border-2 border-[var(--color-border-subtle)] shadow-sm',
        style: { backgroundColor: accentVar },
      };
    case 'common':
    default:
      return {
        classes: 'border border-[var(--color-border-subtle)] shadow-sm opacity-80',
        style: { backgroundColor: accentVar },
      };
  }
}

export default function BadgeDisplay({
  achievement,
  size = 'medium',
  showLabel = true,
}: BadgeDisplayProps) {
  // Enrich with catalog metadata
  const catalogEntry = getBadgeCatalogEntry(achievement.id);

  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16',
  };

  const labelSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
  };

  // Use title/description from catalog if available
  const displayTitle = catalogEntry?.title || achievement.title;
  const displayDescription = catalogEntry?.description || achievement.description;

  // Resolve icon
  const iconName = catalogEntry?.iconName || 'star';
  const iconKey = getLucideIconName(iconName);
  const IconComponent = (Icons as any)[iconKey] || Icons.Star;

  // Resolve background color from accentTone
  const accentVar = catalogEntry
    ? getAccentToneCssVariable(catalogEntry.accentTone)
    : 'var(--color-reward-soft)';

  // Rarity-aware circle treatment
  const rarity = catalogEntry?.rarity ?? 'common';
  const { classes: rarityClasses, style: rarityStyle } = getRarityCircleStyle(rarity, accentVar, size);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Badge circle */}
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center hover:shadow-md transition-shadow cursor-default ${rarityClasses}`}
        style={rarityStyle}
        title={displayDescription}
      >
        <IconComponent
          size={size === 'small' ? 24 : 32}
          className="text-[var(--color-text-primary)]"
        />
      </div>

      {/* Label */}
      {showLabel && (
        <div className="text-center">
          <p className={`${labelSizeClasses[size]} font-semibold text-[var(--color-text-primary)]`}>
            {displayTitle}
          </p>
          {size === 'medium' && (
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 max-w-[80px] line-clamp-2">
              {displayDescription}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
