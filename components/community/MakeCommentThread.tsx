'use client';

import { useEffect, useState } from 'react';
import { getCommentsForMake, saveComment, type FinishedMakeComment } from '@/lib/finishedMakeComments';
import { getOrCreateUserId } from '@/lib/communityProfiles';
import AuthorLink from '@/components/community/AuthorLink';
import { getFinishedMakes } from '@/lib/finishedMakes';
import { addNotification } from '@/lib/notifications';

const MAX_COMMENT_CHARS = 300;
const COMMENT_PREVIEW = 2;

interface MakeCommentThreadProps {
  makeId: string;
}

export default function MakeCommentThread({ makeId }: MakeCommentThreadProps) {
  const [comments, setComments] = useState<FinishedMakeComment[]>([]);
  const [draft, setDraft] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    setComments(getCommentsForMake(makeId));
  }, [makeId]);

  const handleSubmit = () => {
    const msg = draft.trim();
    if (!msg) return;

    const authorId = getOrCreateUserId();
    const displayName =
      (typeof window !== 'undefined' ? localStorage.getItem('displayName') : null) ||
      'Anonymous';

    const newComment = saveComment({ makeId, authorId, displayName, message: msg });
    setComments((prev) => [...prev, newComment]);
    setDraft('');
    setComposerOpen(false);
    // Keep the new comment visible if we were in collapsed state
    setShowAll(true);

    // Notify make owner
    const make = getFinishedMakes().find((m) => m.id === makeId);
    if (make?.authorId && make.authorId !== authorId) {
      addNotification({
        type: 'make_commented',
        recipientId: make.authorId,
        actorId: authorId,
        actorName: displayName,
        targetType: 'finished_make',
        targetId: makeId,
        targetContext: make.projectId,
      });
    }
  };

  const hasOverflow = comments.length > COMMENT_PREVIEW;
  const visible = showAll ? comments : comments.slice(-COMMENT_PREVIEW);

  return (
    <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)]">

      {/* Comments list */}
      {comments.length > 0 ? (
        <div className="mb-3 space-y-3">
          {visible.map((comment) => (
            <div key={comment.id}>
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <AuthorLink authorId={comment.authorId} displayName={comment.displayName} />
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {new Date(comment.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {comment.message}
              </p>
            </div>
          ))}

          {/* Show all / show less toggle */}
          {hasOverflow && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              {showAll
                ? 'Show less'
                : `View ${comments.length - COMMENT_PREVIEW} earlier comment${comments.length - COMMENT_PREVIEW === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      ) : (
        <p className="mb-3 text-xs text-[var(--color-text-muted)] italic">
          Be the first to leave a comment.
        </p>
      )}

      {/* Composer */}
      {composerOpen ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => {
              if (e.target.value.length <= MAX_COMMENT_CHARS) setDraft(e.target.value);
            }}
            placeholder="Leave a comment…"
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
              Post comment
            </button>
            <button
              type="button"
              onClick={() => { setComposerOpen(false); setDraft(''); }}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              Cancel
            </button>
            <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">
              {draft.length}/{MAX_COMMENT_CHARS}
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Leave a comment…
        </button>
      )}

    </div>
  );
}
