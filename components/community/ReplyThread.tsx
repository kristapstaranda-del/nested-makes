'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRepliesForCheckIn, saveReply, type CheckInReply } from '@/lib/checkInReplies';
import { getOrCreateUserId } from '@/lib/communityProfiles';
import { getProfileData } from '@/lib/profile';
import AuthorLink from '@/components/community/AuthorLink';
import { getPublicCheckIns } from '@/lib/authorResolution';
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
  const [replies, setReplies] = useState<CheckInReply[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setReplies(getRepliesForCheckIn(checkInId));
  }, [checkInId]);

  const handleSubmit = () => {
    const msg = draft.trim();
    if (!msg) return;

    const authorId = getOrCreateUserId();
    const displayName = getProfileData().nickname || 'Maker';

    const newReply = saveReply({ checkInId, authorId, displayName, message: msg });
    setReplies((prev) => [...prev, newReply]);
    setDraft('');
    setComposerOpen(false);
    // Keep newly added reply visible if we were collapsed
    setShowAll(true);

    // Notify check-in owner
    const checkIn = getPublicCheckIns().find((ci) => ci.id === checkInId);
    if (checkIn?.authorId && checkIn.authorId !== authorId) {
      addNotification({
        type: 'check_in_replied',
        recipientId: checkIn.authorId,
        actorId: authorId,
        actorName: displayName,
        targetType: 'check_in',
        targetId: checkInId,
        targetContext: checkIn.challengeId,
      });
    }
  };

  const handleCancel = () => {
    setComposerOpen(false);
    setDraft('');
  };

  // ── Compact mode: Reply affordance + count hint linking to the full updates page
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

      {/* Replies list — always visible when replies exist */}
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
                {/* No reaction or reply button on replies — one level only */}
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
              disabled={!draft.trim()}
              className="rounded-lg bg-[var(--color-brand-primary)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-[var(--color-brand-primary-hover)] transition-colors"
            >
              Reply
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
