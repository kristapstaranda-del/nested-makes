'use client';

import { useEffect, useState } from 'react';
import { getMakeLikeState, toggleMakeLike } from '@/lib/finishedMakeReactions';
import { getOrCreateUserId } from '@/lib/communityProfiles';
import { getFinishedMakes } from '@/lib/finishedMakes';
import { addNotification } from '@/lib/notifications';

interface MakeLikeButtonProps {
  makeId: string;
}

export default function MakeLikeButton({ makeId }: MakeLikeButtonProps) {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const userId = getOrCreateUserId();
    const state = getMakeLikeState(makeId, userId);
    setCount(state.count);
    setLiked(state.liked);
  }, [makeId]);

  const handleToggle = () => {
    const userId = getOrCreateUserId();
    const next = toggleMakeLike(makeId, userId);
    setCount(next.count);
    setLiked(next.liked);

    // Notify content owner when liking (not when un-liking)
    if (next.liked) {
      const make = getFinishedMakes().find((m) => m.id === makeId);
      if (make?.authorId && make.authorId !== userId) {
        const actorName =
          (typeof window !== 'undefined' ? localStorage.getItem('displayName') : null) ||
          'Anonymous';
        addNotification({
          type: 'make_liked',
          recipientId: make.authorId,
          actorId: userId,
          actorName,
          targetType: 'finished_make',
          targetId: makeId,
          targetContext: make.projectId,
        });
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={liked ? 'Remove like' : 'Like this make'}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm transition-colors ${
        liked
          ? 'bg-[var(--color-brand-primary-soft)] text-[var(--color-brand-primary)]'
          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
      }`}
    >
      <span aria-hidden>{liked ? '♥' : '♡'}</span>
      {count > 0
        ? <span className="text-xs">{count}</span>
        : !liked && <span className="text-xs">Like</span>}
    </button>
  );
}
