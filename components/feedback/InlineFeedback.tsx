'use client';

import { useEffect, useState } from 'react';
import { MicroFeedback, getFeedbackToneClasses } from '@/lib/microFeedback';
import { getBadgeCatalogEntry, getLucideIconName } from '@/lib/badgeCatalog';
import * as Icons from 'lucide-react';

interface InlineFeedbackProps {
  feedback: MicroFeedback | null;
  onDismiss?: () => void;
}

/**
 * Rarity-specific tone overrides for achievement_unlocked feedback.
 * All other feedback types continue to use getFeedbackToneClasses(tone).
 *
 * Visual ladder (quiet → expressive):
 *  common     — warm baseline, matches the existing celebration tone
 *  meaningful — same gradient, gold-tinted border + badge accent
 *  milestone  — flat warm cream, distinct gold border, ochre text
 *  special    — diagonal gradient + strongest gold border, ochre text
 */
const achievementRarityClasses: Record<
  string,
  ReturnType<typeof getFeedbackToneClasses>
> = {
  common: {
    container:
      'bg-[linear-gradient(to_right,var(--color-reward-soft),var(--color-brand-accent-soft))] border-[var(--color-brand-accent)]/20',
    icon: 'text-2xl',
    text: 'text-[var(--color-brand-accent)]',
    badge: 'bg-[var(--color-brand-accent-soft)] text-[var(--color-brand-accent)]',
  },
  meaningful: {
    container:
      'bg-[linear-gradient(to_right,var(--color-reward-soft),var(--color-brand-accent-soft))] border-[var(--color-reward-primary)]/30',
    icon: 'text-2xl',
    text: 'text-[var(--color-brand-accent)]',
    badge: 'bg-[var(--color-reward-soft)] text-[var(--color-reward-medium)]',
  },
  milestone: {
    container: 'bg-[var(--color-reward-soft)] border-[var(--color-reward-primary)]/40',
    icon: 'text-2xl',
    text: 'text-[var(--color-reward-medium)]',
    badge: 'bg-[var(--color-reward-soft)] text-[var(--color-reward-medium)]',
  },
  special: {
    container:
      'bg-[linear-gradient(135deg,var(--color-reward-soft)_0%,var(--color-brand-accent-soft)_100%)] border-[var(--color-reward-primary)]/55',
    icon: 'text-2xl',
    text: 'text-[var(--color-reward-medium)]',
    badge: 'bg-[var(--color-reward-soft)] text-[var(--color-reward-medium)]',
  },
};

/**
 * InlineFeedback Component
 * Displays a single micro-feedback message inline, with auto-dismiss.
 * Lightweight, mobile-first, Tailwind-only styling.
 * Warm, friendly, and hobby-community oriented.
 * Achievement unlock feedback responds to badge rarity for a calmer visual hierarchy.
 */
export default function InlineFeedback({ feedback, onDismiss }: InlineFeedbackProps) {
  const [isVisible, setIsVisible] = useState(!!feedback);

  useEffect(() => {
    if (!feedback) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
    const duration = feedback.displayDuration || 4000;

    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onDismiss) {
        setTimeout(onDismiss, 300); // Give fade animation time
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [feedback, onDismiss]);

  if (!feedback || !isVisible) {
    return null;
  }

  const toneClasses = getFeedbackToneClasses(feedback.tone);

  // For achievement_unlocked, resolve the catalog entry once — used for both
  // icon rendering and rarity-aware styling.
  const catalogEntry =
    feedback.type === 'achievement_unlocked' && feedback.relatedAchievementId
      ? getBadgeCatalogEntry(feedback.relatedAchievementId)
      : null;

  // Rarity overrides apply only to achievement unlocks; all other types keep toneClasses.
  const activeClasses =
    catalogEntry
      ? (achievementRarityClasses[catalogEntry.rarity] ?? achievementRarityClasses.common)
      : toneClasses;

  // Resolve icon: achievement unlocks use the Lucide badge icon; everything else uses emoji.
  let iconElement: React.ReactNode = feedback.emoji;
  if (catalogEntry) {
    const iconName = catalogEntry.iconName || 'star';
    const iconKey = getLucideIconName(iconName);
    const IconComponent = (Icons as any)[iconKey] || Icons.Star;
    iconElement = <IconComponent size={20} className="text-current" />;
  }

  return (
    <div
      className={`
        transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      <div
        className={`
          rounded-xl p-4 shadow-sm border
          ${activeClasses.container}
        `}
      >
        <div className="flex items-start gap-3">
          {/* Icon/Emoji */}
          <div className={`${activeClasses.icon} flex-shrink-0 mt-0.5`}>
            {iconElement}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold text-sm leading-tight ${activeClasses.text}`}>
                {feedback.title}
              </h3>
              {feedback.type === 'achievement_unlocked' && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${activeClasses.badge}`}>
                  Achievement
                </span>
              )}
            </div>
            <p className={`text-sm mt-1 leading-relaxed ${activeClasses.text} opacity-90`}>
              {feedback.message}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setIsVisible(false)}
            className={`
              flex-shrink-0 text-lg leading-none opacity-60 hover:opacity-100
              transition-opacity ${activeClasses.text} hover:bg-black/5 rounded-full p-1
            `}
            aria-label="Dismiss feedback"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
