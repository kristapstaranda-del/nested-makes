'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getNotifications,
  markOneRead,
  type AppNotification,
  type NotificationType,
} from '@/lib/notifications';
import AuthorLink from '@/components/community/AuthorLink';

// ── Helpers ──────────────────────────────────────────────────────────────────

function verbPhrase(type: NotificationType): string {
  switch (type) {
    case 'check_in_liked':   return 'liked your update';
    case 'check_in_replied': return 'replied to your update';
    case 'make_liked':       return 'liked your make';
    case 'make_commented':   return 'commented on your make';
  }
}

function targetHref(n: AppNotification): string | undefined {
  if (n.targetType === 'check_in' && n.targetContext) {
    return `/challenges/${n.targetContext}/updates`;
  }
  if (n.targetType === 'finished_make' && n.targetContext) {
    return `/projects/${n.targetContext}/makes`;
  }
  return undefined;
}

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NotificationItem({
  n,
  isUnread,
  onRead,
}: {
  n: AppNotification;
  isUnread: boolean;
  onRead: (id: string) => void;
}) {
  const href = targetHref(n);

  const content = (
    <div
      className={`flex items-start gap-3 rounded-xl px-3 py-3 transition-colors ${
        isUnread
          ? 'bg-[var(--color-brand-primary-soft)]'
          : 'bg-transparent hover:bg-[var(--color-bg-soft)]'
      }`}
    >
      {/* Unread indicator */}
      <span
        className={`mt-[7px] h-1.5 w-1.5 flex-none rounded-full ${
          isUnread ? 'bg-[var(--color-brand-primary)]' : 'bg-transparent'
        }`}
        aria-hidden
      />

      {/* Text block */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${isUnread ? 'font-medium text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
          <AuthorLink
            authorId={n.actorId}
            displayName={n.actorName}
            className={`font-semibold ${isUnread ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'} hover:text-[var(--color-brand-primary)] transition-colors`}
          />{' '}
          {verbPhrase(n.type)}
        </p>
        <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
          {timeAgo(n.createdAt)}
        </p>
      </div>

      {/* Chevron for navigable items */}
      {href && (
        <span className="mt-1 text-[var(--color-text-muted)] text-xs flex-none" aria-hidden>
          ›
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block -mx-1"
        onClick={() => onRead(n.id)}
      >
        {content}
      </Link>
    );
  }

  return <div className="-mx-1">{content}</div>;
}

// ── Main component ────────────────────────────────────────────────────────────

const PREVIEW_COUNT = 3;

export default function NotificationFeed() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Snapshot the current list (preserving original isRead values for rendering).
    const loaded = getNotifications();
    setNotifications(loaded);
    // Mark non-navigable ones as read immediately (they have no link to click).
    // Navigable ones are marked read on click via onRead.
    const nonNavigable = loaded.filter(
      (n) => !n.isRead && !targetHref(n)
    );
    nonNavigable.forEach((n) => markOneRead(n.id));
  }, []);

  const handleRead = (id: string) => {
    markOneRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] p-5 shadow-sm">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Notifications</h3>
        {unreadCount > 0 && (
          <span className="rounded-full bg-[var(--color-brand-primary)] px-1.5 py-px text-[10px] font-semibold text-white leading-none tabular-nums">
            {unreadCount}
          </span>
        )}
      </div>

      {/* Empty state */}
      {notifications.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)] italic leading-relaxed">
          Nothing here yet — likes and replies from fellow makers will appear here.
        </p>
      )}

      {/* Notification list */}
      {notifications.length > 0 && (
        <>
          <div className="space-y-0.5">
            {(expanded ? notifications : notifications.slice(0, PREVIEW_COUNT)).map((n) => (
              <NotificationItem
                key={n.id}
                n={n}
                isUnread={!n.isRead}
                onRead={handleRead}
              />
            ))}
          </div>
          {notifications.length > PREVIEW_COUNT && (
            <div className="mt-2 pt-2 border-t border-[var(--color-border-subtle)]">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                {expanded ? 'Show less' : `Show ${notifications.length - PREVIEW_COUNT} more`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
