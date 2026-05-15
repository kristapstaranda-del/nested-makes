'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  createReply,
  getRepliesForCheckIn,
  type CheckInReplyWithAuthor,
} from '@/lib/supabase/checkInReplies';
import { supabase } from '@/lib/supabase/client';
import { getProfileData } from '@/lib/profile';
import AuthorLink from '@/components/community/AuthorLink';
import { addNotification } from '@/lib/notifications';

const MAX_REPLY_CHARS = 200;
const REPLY_PREVIEW = 2;

interface ReplyThreadProps {
  checkInId: string;
  /** When true, renders a count-only hint linking to the updates page instead of the full thread. */
  compact?: boolean;
  /** The challengeId used to build the updates link — required when compact=true. */
  challengeId?: string;
}

export default function ReplyThread({ checkInId, compact, challengeId }: ReplyThreadProps) {
  const [replies, setReplies] = useState<CheckInReplyWithAuthor[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getRepliesForCheckIn(checkInId)
      .then((rows) => {
        if (!cancelled) setReplies(rows);
      })
      .catch(() => {
        // Leave empty on error.
      });
    return () => {
      cancelled = true;
    };
  }, [checkInId]);

  const handleSubmit = async () => {
    const msg = draft.trim();
    if (!msg || submitting) return;
    setSubmitting(true);
    try {
      const newReply = await createReply({ checkInId, message: msg });
      setReplies((prev) => [...prev, newReply]);
      setDraft('');
      setComposerOpen(false);
      setShowAll(true);

      // Notify check-in owner (best effort).
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
            type: 'check_in_replied',
            recipientId: owner.user_id,
            actorId: me,
            actorName,
            targetType: 'check_in',
            targetId: checkInId,
            targetContext: owner.challenge_id,
          });
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ReplyThread] reply submit failed', e);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setComposerOpen(false);
    setDraft('');
  };

  // ── Compact mode: Reply affordance + count hint linking to full updates page
  if (compact) {
    if (!challengeId) return null;
    return (
      <div className="mt-1.5 flex items-center gap-2">
        <Link
          href={`/challenges/${challengeId}/updates`}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Reply
        </Link>
        {replies.length > 0 && (
          <>
            <span className="text-xs text-[var(--color-text-muted)] select-none" aria-hidden>·</span>
            <Link
              href={`/challenges/${challengeId}/updates`}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              {replies.length === 1 ? '1 reply' : `${replies.length} replies`} →
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mt-1.5">
      {/* Action row */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setComposerOpen((v) => !v)}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          {composerOpen ? 'Cancel' : 'Reply'}
        </button>
        {replies.length > 0 && (
          <span className="text-xs text-[var(--color-text-muted)]">
            · {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </span>
        )}
      </div>

      {/* Replies list */}
      {replies.length > 0 && (() => {
        const hasOverflow = replies.length > REPLY_PREVIEW;
        const visible = showAll ? replies : replies.slice(0, REPLY_PREVIEW);
        return (
          <div className="mt-2.5 space-y-2.5">
            {visible.map((reply) => (
              <div
                key={reply.id}
                className="pl-3 border-l-2 border-[var(--color-border-subtle)]"
              >
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <AuthorLink authorId={reply.authorId} displayName={reply.displayName} />
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {new Date(reply.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {reply.message}
                </p>
              </div>
            ))}
            {hasOverflow && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                {showAll
                  ? 'Show fewer replies'
                  : `Show more replies (${replies.length - REPLY_PREVIEW} more)`}
              </button>
            )}
          </div>
        );
      })()}

      {/* Composer */}
      {composerOpen && (
        <div className="mt-2.5 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => {
              if (e.target.value.length <= MAX_REPLY_CHARS) setDraft(e.target.value);
            }}
            placeholder="Write a reply…"
            rows={2}
            autoFocus
            className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-white p-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!draft.trim() || submitting}
              className="rounded-lg bg-[var(--color-brand-primary)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-[var(--color-brand-primary-hover)] transition-colors"
            >
              {submitting ? 'Sending…' : 'Reply'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              Cancel
            </button>
            <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">
              {draft.length}/{MAX_REPLY_CHARS}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
