'use client';

import { useEffect, useState } from 'react';
import {
  createComment,
  getCommentsForMake,
  type FinishedMakeCommentWithAuthor,
} from '@/lib/supabase/finishedMakeComments';
import { supabase } from '@/lib/supabase/client';
import { getProfileData } from '@/lib/profile';
import AuthorLink from '@/components/community/AuthorLink';
import { addNotification } from '@/lib/notifications';

const MAX_COMMENT_CHARS = 300;
const COMMENT_PREVIEW = 2;

interface MakeCommentThreadProps {
  makeId: string;
}

export default function MakeCommentThread({ makeId }: MakeCommentThreadProps) {
  const [comments, setComments] = useState<FinishedMakeCommentWithAuthor[]>([]);
  const [draft, setDraft] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCommentsForMake(makeId)
      .then((rows) => {
        if (!cancelled) setComments(rows);
      })
      .catch(() => {
        // Leave empty on error.
      });
    return () => {
      cancelled = true;
    };
  }, [makeId]);

  const handleSubmit = async () => {
    const msg = draft.trim();
    if (!msg || submitting) return;
    setSubmitting(true);
    try {
      const newComment = await createComment({ makeId, message: msg });
      setComments((prev) => [...prev, newComment]);
      setDraft('');
      setComposerOpen(false);
      setShowAll(true);

      // Notify make owner (best effort).
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
            type: 'make_commented',
            recipientId: owner.user_id,
            actorId: me,
            actorName,
            targetType: 'finished_make',
            targetId: makeId,
            targetContext: owner.project_id,
          });
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[MakeCommentThread] submit failed', e);
      }
    } finally {
      setSubmitting(false);
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
              disabled={!draft.trim() || submitting}
              className="rounded-lg bg-[var(--color-brand-primary)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-[var(--color-brand-primary-hover)] transition-colors"
            >
              {submitting ? 'Posting…' : 'Post comment'}
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
