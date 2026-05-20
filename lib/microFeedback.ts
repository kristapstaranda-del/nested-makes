/**
 * Micro-Feedback System
 *
 * Generates lightweight, warm, inline feedback messages for user actions.
 * Phase 2.4: the `achievement_unlocked` branch was retired along with the
 * legacy achievements module; badges will be rebuilt as a separate feature.
 */

export type FeedbackType =
  | 'habit_started'
  | 'habit_done'
  | 'habit_missed'
  | 'public_checkin_created'
  | 'challenge_joined'
  | 'challenge_updated'
  | 'challenge_archived'
  | 'profile_updated'
  | 'finished_make_submitted';

export type FeedbackTone = 'celebration' | 'encouragement' | 'gentle';

export interface MicroFeedback {
  id: string;
  type: FeedbackType;
  title: string;
  message: string;
  emoji: string;
  tone: FeedbackTone;
  displayDuration?: number; // milliseconds, default 4000
}

function generateFeedbackId(): string {
  return `feedback_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create feedback for habit completion.
 * Accepts optional streak context to return milestone-aware copy at 3, 5, and 7+ days.
 * Accepts optional bounceBack flag to return warmer copy when the previous log was missed.
 */
export function createHabitDoneFeedback(context?: { streak?: number; bounceBack?: boolean }): MicroFeedback {
  const streak = context?.streak;

  if (context?.bounceBack) {
    const messages = [
      { title: 'Glad you came back',  message: "A pause doesn't erase your progress.", emoji: '🌿' },
      { title: 'Back to it',          message: 'Picking it up again still counts.',    emoji: '💛' },
      { title: 'Here again',          message: 'Returning is the whole practice.',     emoji: '🌱' },
    ];
    const picked = messages[Math.floor(Math.random() * messages.length)];
    return {
      id: generateFeedbackId(),
      type: 'habit_done',
      title: picked.title,
      message: picked.message,
      emoji: picked.emoji,
      tone: 'encouragement',
      displayDuration: 4000,
    };
  }

  if (streak !== undefined && streak >= 7) {
    const messages = [
      { title: 'A week of showing up',   message: 'That matters more than it seems.',             emoji: '🌟' },
      { title: 'Day after day',          message: "You've made real space for this.",              emoji: '💛' },
      { title: 'Still going',            message: 'A quiet streak like this is worth noticing.',  emoji: '🌿' },
    ];
    const picked = messages[Math.floor(Math.random() * messages.length)];
    return {
      id: generateFeedbackId(),
      type: 'habit_done',
      title: picked.title,
      message: picked.message,
      emoji: picked.emoji,
      tone: 'celebration',
      displayDuration: 5000,
    };
  }

  if (streak === 5) {
    const messages = [
      { title: 'Five days in',     message: "You're building something real here.",          emoji: '🌱' },
      { title: 'Five in a row',    message: 'The rhythm is really there now.',               emoji: '💛' },
      { title: 'Five days strong', message: 'This practice is starting to feel like yours.', emoji: '✨' },
    ];
    const picked = messages[Math.floor(Math.random() * messages.length)];
    return {
      id: generateFeedbackId(),
      type: 'habit_done',
      title: picked.title,
      message: picked.message,
      emoji: picked.emoji,
      tone: 'encouragement',
      displayDuration: 4000,
    };
  }

  if (streak === 3) {
    const messages = [
      { title: 'Three in a row',     message: 'This is quietly becoming yours.', emoji: '💛' },
      { title: 'Three days going',   message: 'A small rhythm is forming.',      emoji: '🌿' },
      { title: 'Three and counting', message: 'Consistency looks good on you.',  emoji: '⭐' },
    ];
    const picked = messages[Math.floor(Math.random() * messages.length)];
    return {
      id: generateFeedbackId(),
      type: 'habit_done',
      title: picked.title,
      message: picked.message,
      emoji: picked.emoji,
      tone: 'encouragement',
      displayDuration: 4000,
    };
  }

  const messages = [
    { title: 'Nice work!',  message: 'Consistency builds mastery',      emoji: '💛' },
    { title: 'You did it!', message: 'Keep the momentum going',         emoji: '🎯' },
    { title: 'Excellent!',  message: 'Showing up is half the battle',   emoji: '⭐' },
    { title: 'Love it!',    message: 'Your hobby is growing with you',  emoji: '🌱' },
    { title: 'Boom!',       message: 'One step closer to your goals',   emoji: '🚀' },
  ];
  const picked = messages[Math.floor(Math.random() * messages.length)];
  return {
    id: generateFeedbackId(),
    type: 'habit_done',
    title: picked.title,
    message: picked.message,
    emoji: picked.emoji,
    tone: 'encouragement',
    displayDuration: 4000,
  };
}

export function createHabitMissedFeedback(): MicroFeedback {
  const messages = [
    { title: "That's okay", message: 'Tomorrow is a fresh start', emoji: '🌱' },
    { title: 'No worries', message: 'Every day is a new chance', emoji: '🌅' },
    { title: 'All good', message: "Progress isn't always linear", emoji: '💙' },
    { title: 'Be kind to yourself', message: "You'll get the next one", emoji: '🤗' },
    { title: 'Keep going', message: "One miss doesn't break the momentum", emoji: '💪' },
  ];
  const picked = messages[Math.floor(Math.random() * messages.length)];
  return {
    id: generateFeedbackId(),
    type: 'habit_missed',
    title: picked.title,
    message: picked.message,
    emoji: picked.emoji,
    tone: 'gentle',
    displayDuration: 4000,
  };
}

export function createHabitStartedFeedback(): MicroFeedback {
  return {
    id: generateFeedbackId(),
    type: 'habit_started',
    title: 'Habit set up!',
    message: 'A new private habit is ready—small momentum starts here.',
    emoji: '🌿',
    tone: 'encouragement',
    displayDuration: 4500,
  };
}

export function createChallengeUpdatedFeedback(): MicroFeedback {
  return {
    id: generateFeedbackId(),
    type: 'challenge_updated',
    title: 'Challenge updated',
    message: 'Your plan is saved and ready for the next session.',
    emoji: '🛠️',
    tone: 'gentle',
    displayDuration: 4500,
  };
}

export function createPublicCheckInFeedback(): MicroFeedback {
  const messages = [
    { title: 'Shared!', message: 'The community loves seeing your progress', emoji: '✨' },
    { title: 'Posted!', message: "You're inspiring others", emoji: '💬' },
    { title: 'Check-in sent!', message: 'Thanks for sharing your journey', emoji: '🎨' },
    { title: 'Awesome!', message: 'Your update is live', emoji: '🌟' },
  ];
  const picked = messages[Math.floor(Math.random() * messages.length)];
  return {
    id: generateFeedbackId(),
    type: 'public_checkin_created',
    title: picked.title,
    message: picked.message,
    emoji: picked.emoji,
    tone: 'encouragement',
    displayDuration: 4000,
  };
}

export function createChallengeJoinedFeedback(): MicroFeedback {
  return {
    id: generateFeedbackId(),
    type: 'challenge_joined',
    title: 'Challenge Started!',
    message: 'Time to build something amazing',
    emoji: '🚀',
    tone: 'celebration',
    displayDuration: 4000,
  };
}

export function createChallengeArchivedFeedback(): MicroFeedback {
  return {
    id: generateFeedbackId(),
    type: 'challenge_archived',
    title: 'Challenge Complete!',
    message: 'You crushed it — celebrate this win',
    emoji: '🎉',
    tone: 'celebration',
    displayDuration: 5000,
  };
}

export function createProfileUpdatedFeedback(): MicroFeedback {
  return {
    id: generateFeedbackId(),
    type: 'profile_updated',
    title: 'Profile updated',
    message: 'Your creative identity card is refreshed.',
    emoji: '✨',
    tone: 'gentle',
    displayDuration: 4000,
  };
}

export function createFinishedMakeFeedback(): MicroFeedback {
  return {
    id: generateFeedbackId(),
    type: 'finished_make_submitted',
    title: 'Make shared!',
    message: 'Your finished project is now part of your maker story.',
    emoji: '🎉',
    tone: 'celebration',
    displayDuration: 5000,
  };
}

export function createFeedback(type: FeedbackType, context?: Record<string, unknown>): MicroFeedback {
  switch (type) {
    case 'habit_done':
      return createHabitDoneFeedback({
        streak: typeof context?.streak === 'number' ? context.streak : undefined,
        bounceBack: context?.bounceBack === true,
      });
    case 'habit_missed':
      return createHabitMissedFeedback();
    case 'habit_started':
      return createHabitStartedFeedback();
    case 'public_checkin_created':
      return createPublicCheckInFeedback();
    case 'challenge_joined':
      return createChallengeJoinedFeedback();
    case 'challenge_updated':
      return createChallengeUpdatedFeedback();
    case 'challenge_archived':
      return createChallengeArchivedFeedback();
    case 'profile_updated':
      return createProfileUpdatedFeedback();
    case 'finished_make_submitted':
      return createFinishedMakeFeedback();
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function getFeedbackToneClasses(tone: FeedbackTone): {
  container: string;
  icon: string;
  text: string;
  badge: string;
} {
  switch (tone) {
    case 'celebration':
      return {
        container: 'bg-[linear-gradient(to_right,var(--color-reward-soft),var(--color-brand-accent-soft))] border-[var(--color-brand-accent)]/20',
        icon: 'text-2xl',
        text: 'text-[var(--color-brand-accent)]',
        badge: 'bg-[var(--color-brand-accent-soft)] text-[var(--color-brand-accent)]',
      };
    case 'encouragement':
      return {
        container: 'bg-[linear-gradient(to_right,var(--color-brand-primary-soft),var(--color-brand-secondary-soft))] border-[var(--color-brand-primary)]/10',
        icon: 'text-2xl',
        text: 'text-[var(--color-brand-primary)]',
        badge: 'bg-[var(--color-brand-primary-soft)] text-[var(--color-brand-primary)]',
      };
    case 'gentle':
      return {
        container: 'bg-[linear-gradient(to_right,var(--color-success-soft),var(--color-warning-soft))] border-[var(--color-success)]/10',
        icon: 'text-2xl',
        text: 'text-[var(--color-success)]',
        badge: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
      };
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}
