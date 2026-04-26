'use client';

import { useEffect, useState } from 'react';
import { getReactionState, toggleReaction } from '@/lib/checkInReactions';
import { getOrCreateUserId } from '@/lib/communityProfiles';
import { getPublicCheckIns } from '@/lib/authorResolution';
import { addNotification } from '@/lib/notifications';

interface ReactionButtonProps {
  checkInId: string;
}

export default function ReactionButton({ checkInId }: ReactionButtonProps) {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const userId = getOrCreateUserId();
    const state = getReactionState(checkInId, userId);
    setCount(state.count);
    setLiked(state.liked);
  }, [checkInId]);

  const handleToggle = () => {
    const userId = getOrCreateUserId();
    const next = toggleReaction(checkInId, userId);
    setCount(next.count);
    setLiked(next.liked);

    // Notify content owner when liking (not when un-liking)
    if (next.liked) {
      const checkIn = getPublicCheckIns().find((ci) => ci.id === checkInId);
      if (checkIn?.authorId && checkIn.authorId !== userId) {
        const actorName =
          (typeof window !== 'undefined' ? localStorage.getItem('displayName') : null) ||
          'Anonymous';
        addNotification({
          type: 'check_in_liked',
          recipientId: checkIn.authorId,
          actorId: userId,
          actorName,
          targetType: 'check_in',
          targetId: checkInId,
          targetContext: checkIn.challengeId,
        });
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={liked ? 'Remove reaction' : 'React to this update'}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm transition-colors ${
        liked
          ? 'bg-[var(--color-brand-primary-soft)] text-[var(--color-brand-primary)]'
          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
      }`}
    >
      <span aria-hidden>{liked ? '♥' : '♡'}</span>
      {count > 0 && <span className="text-xs">{count}</span>}
    </button>
  );
}
