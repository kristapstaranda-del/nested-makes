'use client';

import { useState } from 'react';
import AuthorLink from '@/components/community/AuthorLink';

const PREVIEW_COUNT = 2;

interface CheckIn {
  id: string;
  challengeId?: string;
  projectId?: string;
  habitId?: string;
  date: string;
  message: string;
  displayName: string;
  authorId?: string;
  imageUrl?: string;
}

interface ProfileActivityProps {
  hasActiveHabit: boolean;
  todayHabitStatus: 'done' | 'missed' | null;
  checkIns: CheckIn[];
}

export default function ProfileActivity({
  hasActiveHabit,
  todayHabitStatus,
  checkIns,
}: ProfileActivityProps) {
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? checkIns : checkIns.slice(0, PREVIEW_COUNT);
  const hasMore = checkIns.length > PREVIEW_COUNT;

  return (
    <div className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Recent activity</h3>

      {/* Daily habit */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Daily habit</p>
        {hasActiveHabit ? (
          <p className="text-sm text-[var(--color-text-secondary)]">
            {todayHabitStatus === 'done'
              ? "Today's habit is checked in. Nice glide!"
              : todayHabitStatus === 'missed'
              ? "Today's habit is missed, and that's okay."
              : 'No check-in yet for today.'}
          </p>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)] italic">Add a habit to nurture a steady practice.</p>
        )}
      </div>

      {/* Latest updates — read-only preview */}
      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Latest updates</p>
        {checkIns.length > 0 ? (
          <div>
            {visible.map((checkIn, idx) => (
              <div
                key={checkIn.id}
                className={`flex items-start gap-3 py-2.5 ${idx < visible.length - 1 ? 'border-b border-[var(--color-border-subtle)]' : ''}`}
              >
                {/* Text content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <AuthorLink authorId={checkIn.authorId} displayName={checkIn.displayName} />
                    <p className="text-[10px] text-[var(--color-text-muted)] flex-none">
                      {new Date(checkIn.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  {checkIn.message ? (
                    <p className="text-sm text-[var(--color-text-secondary)] leading-snug">
                      {checkIn.message.length > 90 ? checkIn.message.slice(0, 90) + '…' : checkIn.message}
                    </p>
                  ) : !checkIn.imageUrl && (
                    <p className="text-sm text-[var(--color-text-muted)] italic">Made a little progress today.</p>
                  )}
                </div>
                {/* Small thumbnail — decorative in preview context */}
                {checkIn.imageUrl && (
                  <div className="shrink-0 w-14 h-14 overflow-hidden rounded-lg bg-[var(--color-bg-soft)]">
                    <img
                      src={checkIn.imageUrl}
                      alt=""
                      aria-hidden
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Expand / collapse */}
            {hasMore && (
              <div className="mt-2 pt-2 border-t border-[var(--color-border-subtle)]">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                >
                  {expanded ? 'Show less' : 'See more updates'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)] italic">No updates yet — post your first craft note when you're ready.</p>
        )}
      </div>
    </div>
  );
}
