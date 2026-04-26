/**
 * notifications.ts
 *
 * Lightweight in-app notification layer for community interactions.
 *
 * Supported types (MVP):
 *   - check_in_liked    someone liked your challenge update
 *   - check_in_replied  someone replied to your challenge update
 *   - make_liked        someone liked your finished make
 *   - make_commented    someone commented on your finished make
 *
 * Storage: localStorage key 'hobbyBuddyNotifications', flat array, newest-first.
 * Identity: recipientId / actorId are the stable hobbyBuddyUserId values.
 * No server, no push, no preferences — localStorage only.
 *
 * Migration path: swap readAll/writeAll for API calls when auth lands.
 */

const STORAGE_KEY = 'hobbyBuddyNotifications';
const MAX_STORED = 50; // keep the store bounded

export type NotificationType =
  | 'check_in_liked'
  | 'check_in_replied'
  | 'make_liked'
  | 'make_commented';

export interface AppNotification {
  id: string;
  type: NotificationType;
  /** Content owner — who receives this notification. */
  recipientId: string;
  /** Who performed the action. */
  actorId: string;
  actorName: string;
  targetType: 'check_in' | 'finished_make';
  /** ID of the check-in or finished make being acted on. */
  targetId: string;
  /**
   * Navigation hint: challengeId for check-ins, projectId for finished makes.
   * Used to build the link back to the relevant content page.
   */
  targetContext?: string;
  createdAt: string; // ISO timestamp
  isRead: boolean;
}

// ── Storage helpers ──────────────────────────────────────────────────────────

function readAll(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: AppNotification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns notifications for the current device user, newest first.
 * Reads the current userId from localStorage at call time.
 */
export function getNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  const currentId = localStorage.getItem('hobbyBuddyUserId');
  if (!currentId) return [];
  return readAll()
    .filter((n) => n.recipientId === currentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Returns the number of unread notifications for the current user. */
export function getUnreadCount(): number {
  return getNotifications().filter((n) => !n.isRead).length;
}

/**
 * Appends a notification.
 * Silently no-ops if the actor is the same as the recipient (no self-notifications).
 */
export function addNotification(
  data: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>,
): void {
  // Never self-notify
  if (data.actorId === data.recipientId) return;

  const newItem: AppNotification = {
    ...data,
    id: `notif_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  const all = readAll();
  // Prepend (newest first) and cap to MAX_STORED
  const trimmed = [newItem, ...all].slice(0, MAX_STORED);
  writeAll(trimmed);
}

/** Marks all notifications for the current user as read. */
export function markAllRead(): void {
  if (typeof window === 'undefined') return;
  const currentId = localStorage.getItem('hobbyBuddyUserId');
  if (!currentId) return;
  const updated = readAll().map((n) =>
    n.recipientId === currentId ? { ...n, isRead: true } : n
  );
  writeAll(updated);
}

/** Marks a single notification as read by id. */
export function markOneRead(id: string): void {
  const updated = readAll().map((n) => (n.id === id ? { ...n, isRead: true } : n));
  writeAll(updated);
}

/** Removes all notifications for the current user. Dev/test use only. */
export function clearNotifications(): void {
  if (typeof window === 'undefined') return;
  const currentId = localStorage.getItem('hobbyBuddyUserId');
  if (!currentId) return;
  writeAll(readAll().filter((n) => n.recipientId !== currentId));
}
