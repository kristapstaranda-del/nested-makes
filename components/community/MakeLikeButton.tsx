'use client';

import { useEffect, useState } from 'react';
import { getMakeLikeState, toggleMakeLike } from '@/lib/supabase/finishedMakeReactions';
import { supabase } from '@/lib/supabase/client';
import { addNotification } from '@/lib/notifications';
import { getProfileData } from '@/lib/profile';

interface MakeLikeButtonProps {
  makeId: string;
}

export default function MakeLikeButton({ makeId }: MakeLikeButtonProps) {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMakeLikeState(makeId)
      .then((state) => {
        if (!cancelled) {
          setCount(state.count);
          setLiked(state.liked);
        }
      })
      .catch(() => {
        // Anonymous or transient error — leave default zero state.
      });
    return () => {
      cancelled = true;
    };
  }, [makeId]);

  const handleToggle = async () => {
    if (pending) return;
    setPending(true);
    try {
      const next = await toggleMakeLike(makeId);
      setCount(next.count);
      setLiked(next.liked);

      // Notify content owner when liking (not when un-liking).
      if (next.liked) {
        const { data: userData } = await supabase.auth.getUser();
        const me = userData.user?.id;
        if (me) {
          const { data: row } = await supabase
            .from('finished_makes')
            .select('user_id, project_id')
            .eq('id', makeId)
            .maybeSingle();
          const owner = (row as { user_id: string; project_id: string } | null) ?? null;
          if (owner && owner.user_id !== me) {
            const actorName = getProfileData().nickname || 'Maker';
            addNotification({
              type: 'make_liked',
              recipientId: owner.user_id,
              actorId: me,
              actorName,
              targetType: 'finished_make',
              targetId: makeId,
              targetContext: owner.project_id,
            });
          }
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[MakeLikeButton] toggle failed', e);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending}
      aria-label={liked ? 'Remove like' : 'Like this make'}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm transition-colors disabled:opacity-60 ${
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
