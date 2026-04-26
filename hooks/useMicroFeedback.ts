'use client';

import { useState, useCallback, useRef } from 'react';
import {
  MicroFeedback,
  FeedbackType,
  createFeedback,
  createAchievementUnlockedFeedback,
} from '@/lib/microFeedback';
import {
  getEarnedAchievements,
  Achievement,
} from '@/lib/achievements';
import {
  getEarnedAchievementSnapshot,
  detectUnlockedAchievement,
  EarnedAchievementSet,
} from '@/lib/achievementHelper';

interface UseMicroFeedbackOptions {
  onFeedbackShow?: (feedback: MicroFeedback) => void;
  onFeedbackDismiss?: (feedbackId: string) => void;
}

/**
 * useMicroFeedback Hook
 * Manages micro-feedback state and auto-handling of achievement unlocks
 * Use this to integrate micro-feedback into components
 */
export function useMicroFeedback(options?: UseMicroFeedbackOptions) {
  const [currentFeedback, setCurrentFeedback] = useState<MicroFeedback | null>(null);
  const achievementSnapshotRef = useRef<EarnedAchievementSet>(getEarnedAchievementSnapshot());

  /**
   * Show feedback for an action, with smart achievement unlock detection
   * If no achievement was just unlocked, show the action feedback
   * If an achievement was just unlocked, show the achievement feedback instead
   */
  const showFeedback = useCallback(
    async (type: FeedbackType, context?: Record<string, any>) => {
      try {
        // For actions that can unlock achievements, check for new unlocks
        if (
          (type === 'habit_done' ||
            type === 'habit_missed' ||
            type === 'challenge_joined' ||
            type === 'challenge_archived' ||
            type === 'public_checkin_created') &&
          !context?.skipAchievementCheck
        ) {
          const unlockedAch = detectUnlockedAchievement(achievementSnapshotRef.current);
          if (unlockedAch) {
            // New achievement unlocked! Show that instead
            const achievementFeedback = createAchievementUnlockedFeedback(
              unlockedAch.title,
              unlockedAch.emoji,
              unlockedAch.id
            );
            setCurrentFeedback(achievementFeedback);
            achievementSnapshotRef.current = getEarnedAchievementSnapshot();
            options?.onFeedbackShow?.(achievementFeedback);
            return;
          }
          // Update snapshot for next check
          achievementSnapshotRef.current = getEarnedAchievementSnapshot();
        }

        // No new achievement, show the action feedback
        const feedback = createFeedback(type, context);
        setCurrentFeedback(feedback);
        options?.onFeedbackShow?.(feedback);
      } catch (error) {
        console.error('Error creating feedback:', error);
      }
    },
    [options]
  );

  /**
   * Manually dismiss current feedback
   */
  const dismissFeedback = useCallback(() => {
    if (currentFeedback) {
      options?.onFeedbackDismiss?.(currentFeedback.id);
    }
    setCurrentFeedback(null);
  }, [currentFeedback, options]);

  /**
   * Manually set feedback (for special cases)
   */
  const setFeedback = useCallback((feedback: MicroFeedback | null) => {
    setCurrentFeedback(feedback);
    if (feedback) {
      options?.onFeedbackShow?.(feedback);
    }
  }, [options]);

  /**
   * Update the achievement snapshot (call this at the start of an action flow)
   * to establish a baseline for unlock detection
   */
  const captureAchievementSnapshot = useCallback(() => {
    achievementSnapshotRef.current = getEarnedAchievementSnapshot();
  }, []);

  return {
    currentFeedback,
    showFeedback,
    dismissFeedback,
    setFeedback,
    captureAchievementSnapshot,
  };
}
