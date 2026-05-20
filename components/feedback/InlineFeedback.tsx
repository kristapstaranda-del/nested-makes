'use client';

import { useEffect, useState } from 'react';
import { MicroFeedback, getFeedbackToneClasses } from '@/lib/microFeedback';

interface InlineFeedbackProps {
  feedback: MicroFeedback | null;
  onDismiss?: () => void;
}

/**
 * Single transient toast that auto-dismisses. Phase 2.4 removed the
 * achievement-unlock branch along with the badge catalog; the rendering is
 * now a simple emoji + title + message pattern driven by feedback.tone.
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
        setTimeout(onDismiss, 300);
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [feedback, onDismiss]);

  if (!feedback || !isVisible) {
    return null;
  }

  const toneClasses = getFeedbackToneClasses(feedback.tone);

  return (
    <div
      className={`
        transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      <div className={`rounded-xl p-4 shadow-sm border ${toneClasses.container}`}>
        <div className="flex items-start gap-3">
          <div className={`${toneClasses.icon} flex-shrink-0 mt-0.5`}>
            {feedback.emoji}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-sm leading-tight ${toneClasses.text}`}>
              {feedback.title}
            </h3>
            <p className={`text-sm mt-1 leading-relaxed ${toneClasses.text} opacity-90`}>
              {feedback.message}
            </p>
          </div>

          <button
            onClick={() => setIsVisible(false)}
            className={`
              flex-shrink-0 text-lg leading-none opacity-60 hover:opacity-100
              transition-opacity ${toneClasses.text} hover:bg-black/5 rounded-full p-1
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
