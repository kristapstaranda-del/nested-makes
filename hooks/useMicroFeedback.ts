'use client';

import { useState, useCallback } from 'react';
import {
  MicroFeedback,
  FeedbackType,
  createFeedback,
} from '@/lib/microFeedback';

interface UseMicroFeedbackOptions {
  onFeedbackShow?: (feedback: MicroFeedback) => void;
  onFeedbackDismiss?: (feedbackId: string) => void;
}

/**
 * useMicroFeedback
 *
 * Manages a single transient feedback toast. Phase 2.4 removed achievement
 * unlock detection — feedback now maps 1:1 to the action that fired it.
 * `captureAchievementSnapshot` is kept as a no-op so existing call sites
 * don't need to be edited; it will be removed alongside the future badges
 * rebuild.
 */
export function useMicroFeedback(options?: UseMicroFeedbackOptions) {
  const [currentFeedback, setCurrentFeedback] = useState<MicroFeedback | null>(null);

  const showFeedback = useCallback(
    (type: FeedbackType, context?: Record<string, unknown>) => {
      try {
        const feedback = createFeedback(type, context);
        setCurrentFeedback(feedback);
        options?.onFeedbackShow?.(feedback);
      } catch (error) {
        console.error('Error creating feedback:', error);
      }
    },
    [options],
  );

  const dismissFeedback = useCallback(() => {
    if (currentFeedback) {
      options?.onFeedbackDismiss?.(currentFeedback.id);
    }
    setCurrentFeedback(null);
  }, [currentFeedback, options]);

  const setFeedback = useCallback(
    (feedback: MicroFeedback | null) => {
      setCurrentFeedback(feedback);
      if (feedback) {
        options?.onFeedbackShow?.(feedback);
      }
    },
    [options],
  );

  // Legacy no-op for backward compatibility — see file header.
  const captureAchievementSnapshot = useCallback(() => {}, []);

  return {
    currentFeedback,
    showFeedback,
    dismissFeedback,
    setFeedback,
    captureAchievementSnapshot,
  };
}
