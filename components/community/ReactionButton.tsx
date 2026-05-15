'use client';

import { useEffect, useState } from 'react';
import { getReactionState, toggleReaction } from '@/lib/supabase/checkInReactions';
import { supabase } from '@/lib/supabase/client';
import { addNotification } from '@/lib/notifications';
import { getProfileData } from '@/lib/profile';

interface ReactionButtonProps {
  checkInId: string;
}

export default function ReactionButton({ checkInId }: ReactionButtonProps) {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getReactionState(checkInId)
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
  }, [checkInId]);

  const handleToggle = async () => {
    if (pending) return;
    setPending(true);
    try {
      const next = await toggleReaction(checkInId);
      setCount(next.count);
      setLiked(next.liked);

      // Notify content owner when liking (not when un-liking).
      if (next.liked) {
        const { data: userData } = await supabase.auth.getUser();
        const me = userData.user?.id;
        if (me) {
          const { data: row } = await supabase
            .from('check_ins')
            .select('user_id, challenge_id')
            .eq('id', checkInId)
            .maybeSingle();
          const owner = (row as { user_id: string; challenge_id: string } | null) ?? null;
          if (owner && owner.user_id !== me) {
            const actorName = getProfileData().nickname || 'Maker';
            addNotification({
              type: 'check_in_liked',
              recipientId: owner.user_id,
              actorId: me,
              actorName,
              targetType: 'check_in',
              targetId: checkInId,
              targetContext: owner.challenge_id,
            });
          }
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ReactionButton] toggle failed', e);
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
      aria-label={liked ? 'Remove reaction' : 'React to this update'}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm transition-colors disabled:opacity-60 ${
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
