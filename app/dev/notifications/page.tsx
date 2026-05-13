'use client';

import { useEffect, useState } from 'react';
import {
  addNotification,
  getNotifications,
  clearNotifications,
  type AppNotification,
  type NotificationType,
} from '@/lib/notifications';
import { getOrCreateUserId, MOCK_PROFILES } from '@/lib/communityProfiles';
import { getProfileData } from '@/lib/profile';
import { getPublicCheckIns, type PublicCheckIn } from '@/lib/authorResolution';
import { getFinishedMakes, type FinishedMake } from '@/lib/finishedMakes';
import { toggleReaction } from '@/lib/checkInReactions';
import { toggleMakeLike } from '@/lib/finishedMakeReactions';
import { saveComment } from '@/lib/finishedMakeComments';
import { saveReply } from '@/lib/checkInReplies';

// ── Types ────────────────────────────────────────────────────────────────────

interface ActionLogEntry {
  id: number;
  label: string;
  actor: string;
  targetSummary: string;
  type: NotificationType;
  blocked: boolean;
  ts: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<NotificationType, string> = {
  check_in_liked:   'bg-blue-600',
  check_in_replied: 'bg-purple-600',
  make_liked:       'bg-pink-600',
  make_commented:   'bg-amber-600',
};

function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(iso).toLocaleDateString();
  } catch { return ''; }
}

function truncate(str: string | undefined, n = 55): string {
  if (!str) return '(no content)';
  return str.length <= n ? str : str.slice(0, n) + '…';
}

/**
 * Idempotently adds a like reaction for a check-in without toggling.
 * Calls toggleReaction only if the actor hasn't already liked it, so
 * repeated simulation clicks don't remove the reaction.
 */
function ensureCheckInReaction(checkInId: string, actorId: string): void {
  // toggleReaction returns { liked: true } when the like was ADDED.
  // If already liked, it would remove it — so we check first.
  try {
    const raw = localStorage.getItem('checkInReactions');
    const store: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    const reactors = store[checkInId] ?? [];
    if (!reactors.includes(actorId)) {
      toggleReaction(checkInId, actorId);
    }
  } catch {
    toggleReaction(checkInId, actorId);
  }
}

/**
 * Idempotently adds a like reaction for a finished make without toggling.
 */
function ensureMakeReaction(makeId: string, actorId: string): void {
  try {
    const raw = localStorage.getItem('finishedMakeReactions');
    const store: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    const reactors = store[makeId] ?? [];
    if (!reactors.includes(actorId)) {
      toggleMakeLike(makeId, actorId);
    }
  } catch {
    toggleMakeLike(makeId, actorId);
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsDevPage() {
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [latestCheckIn, setLatestCheckIn] = useState<PublicCheckIn | null>(null);
  const [latestMake, setLatestMake] = useState<FinishedMake | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [log, setLog] = useState<ActionLogEntry[]>([]);
  const [logCounter, setLogCounter] = useState(0);
  // Raw storage — populated by refresh(), shown in Storage Inspector section
  const [rawCheckInReactions, setRawCheckInReactions] = useState<Record<string, unknown>>({});
  const [rawCheckInReplies, setRawCheckInReplies] = useState<Array<Record<string, unknown>>>([]);
  const [rawMakeReactions, setRawMakeReactions] = useState<Record<string, unknown>>({});
  const [rawMakeComments, setRawMakeComments] = useState<Array<Record<string, unknown>>>([]);

  const maya = MOCK_PROFILES.find((p) => p.id === 'mock_maya')!;
  const sam  = MOCK_PROFILES.find((p) => p.id === 'mock_sam')!;
  const jo   = MOCK_PROFILES.find((p) => p.id === 'mock_jo')!;

  useEffect(() => {
    setMounted(true);
    refresh();
  }, []);

  function refresh() {
    const uid = getOrCreateUserId();
    const name = getProfileData().name || 'Maker';
    setUserId(uid);
    setDisplayName(name);

    const checkIns = getPublicCheckIns().filter((ci) => ci.authorId === uid);
    const ci0 = checkIns[0] ?? null;
    setLatestCheckIn(ci0);

    const makes = getFinishedMakes().filter((m) => m.authorId === uid);
    const m0 = makes[0] ?? null;
    setLatestMake(m0);

    setNotifications(getNotifications());

    // Read raw localStorage so the storage inspector shows the actual stored state.
    // We use ci0 / m0 (not React state) because state hasn't updated yet in this call.
    try {
      const raw = localStorage.getItem('checkInReactions');
      setRawCheckInReactions(raw ? JSON.parse(raw) : {});
    } catch { setRawCheckInReactions({}); }

    try {
      const raw = localStorage.getItem('checkInReplies');
      const all: Array<Record<string, unknown>> = raw ? JSON.parse(raw) : [];
      setRawCheckInReplies(
        Array.isArray(all) ? all.filter((r) => r?.checkInId === ci0?.id) : []
      );
    } catch { setRawCheckInReplies([]); }

    try {
      const raw = localStorage.getItem('finishedMakeReactions');
      setRawMakeReactions(raw ? JSON.parse(raw) : {});
    } catch { setRawMakeReactions({}); }

    try {
      const raw = localStorage.getItem('finishedMakeComments');
      const all: Array<Record<string, unknown>> = raw ? JSON.parse(raw) : [];
      setRawMakeComments(
        Array.isArray(all) ? all.filter((c) => c?.makeId === m0?.id) : []
      );
    } catch { setRawMakeComments([]); }
  }

  function runAction(opts: {
    label: string;
    type: NotificationType;
    actorId: string;
    actorName: string;
    targetType: 'check_in' | 'finished_make';
    targetId: string;
    targetContext?: string;
    targetSummary: string;
    recipientId: string;
  }) {
    const before = getNotifications().length;

    addNotification({
      type: opts.type,
      recipientId: opts.recipientId,
      actorId: opts.actorId,
      actorName: opts.actorName,
      targetType: opts.targetType,
      targetId: opts.targetId,
      targetContext: opts.targetContext,
    });

    const after = getNotifications().length;
    const blocked = after === before;

    const entry: ActionLogEntry = {
      id: logCounter,
      label: opts.label,
      actor: `${opts.actorName} (${opts.actorId})`,
      targetSummary: opts.targetSummary,
      type: opts.type,
      blocked,
      ts: new Date().toLocaleTimeString(),
    };

    setLogCounter((n) => n + 1);
    setLog((prev) => [entry, ...prev].slice(0, 20));
    // refresh() updates notifications AND raw storage inspector in one pass
    refresh();
  }

  // ── Scenario helpers ──────────────────────────────────────────────────────

  function mockLikesCheckIn(actor: typeof maya) {
    if (!latestCheckIn) return;
    // Store the actual reaction so the updates view shows the correct count.
    ensureCheckInReaction(latestCheckIn.id, actor.id);
    runAction({
      label: `${actor.displayName} liked your update`,
      type: 'check_in_liked',
      actorId: actor.id,
      actorName: actor.displayName,
      recipientId: userId,
      targetType: 'check_in',
      targetId: latestCheckIn.id,
      targetContext: latestCheckIn.challengeId,
      targetSummary: truncate(latestCheckIn.message),
    });
  }

  function mockRepliesToCheckIn(actor: typeof sam) {
    if (!latestCheckIn) return;
    // Persist the actual reply so it appears under the parent update.
    saveReply({
      checkInId: latestCheckIn.id,
      authorId: actor.id,
      displayName: actor.displayName,
      message: `Great progress! (simulated reply from ${actor.displayName})`,
    });
    runAction({
      label: `${actor.displayName} replied to your update`,
      type: 'check_in_replied',
      actorId: actor.id,
      actorName: actor.displayName,
      recipientId: userId,
      targetType: 'check_in',
      targetId: latestCheckIn.id,
      targetContext: latestCheckIn.challengeId,
      targetSummary: truncate(latestCheckIn.message),
    });
  }

  function mockLikesMake(actor: typeof jo) {
    if (!latestMake) return;
    // Store the actual reaction so the makes view shows the correct count.
    ensureMakeReaction(latestMake.id, actor.id);
    runAction({
      label: `${actor.displayName} liked your make`,
      type: 'make_liked',
      actorId: actor.id,
      actorName: actor.displayName,
      recipientId: userId,
      targetType: 'finished_make',
      targetId: latestMake.id,
      targetContext: latestMake.projectId,
      targetSummary: truncate(latestMake.caption ?? latestMake.displayName),
    });
  }

  // Second different user likes — lets us test "multiple actors, count > 1" directly
  function mockLikesCheckIn2(actor: typeof jo) {
    if (!latestCheckIn) return;
    ensureCheckInReaction(latestCheckIn.id, actor.id);
    runAction({
      label: `${actor.displayName} also liked your update`,
      type: 'check_in_liked',
      actorId: actor.id,
      actorName: actor.displayName,
      recipientId: userId,
      targetType: 'check_in',
      targetId: latestCheckIn.id,
      targetContext: latestCheckIn.challengeId,
      targetSummary: truncate(latestCheckIn.message),
    });
  }

  function mockLikesMake2(actor: typeof sam) {
    if (!latestMake) return;
    ensureMakeReaction(latestMake.id, actor.id);
    runAction({
      label: `${actor.displayName} also liked your make`,
      type: 'make_liked',
      actorId: actor.id,
      actorName: actor.displayName,
      recipientId: userId,
      targetType: 'finished_make',
      targetId: latestMake.id,
      targetContext: latestMake.projectId,
      targetSummary: truncate(latestMake.caption ?? latestMake.displayName),
    });
  }

  function mockCommentsMake(actor: typeof maya) {
    if (!latestMake) return;
    // Persist the actual comment so it appears in the destination view.
    saveComment({
      makeId: latestMake.id,
      authorId: actor.id,
      displayName: actor.displayName,
      message: `Nice work on this! (simulated comment from ${actor.displayName})`,
    });
    runAction({
      label: `${actor.displayName} commented on your make`,
      type: 'make_commented',
      actorId: actor.id,
      actorName: actor.displayName,
      recipientId: userId,
      targetType: 'finished_make',
      targetId: latestMake.id,
      targetContext: latestMake.projectId,
      targetSummary: truncate(latestMake.caption ?? latestMake.displayName),
    });
  }

  function selfAction(type: NotificationType) {
    const targetType = type.startsWith('check_in') ? 'check_in' : 'finished_make';
    const target = targetType === 'check_in' ? latestCheckIn : latestMake;
    const targetId = target?.id ?? 'no-content';
    const targetContext =
      targetType === 'check_in'
        ? (latestCheckIn?.challengeId)
        : (latestMake?.projectId);
    const targetSummary =
      targetType === 'check_in'
        ? truncate(latestCheckIn?.message)
        : truncate(latestMake?.caption ?? latestMake?.displayName);

    runAction({
      label: `You (self) — ${type.replace(/_/g, ' ')}`,
      type,
      actorId: userId,
      actorName: displayName,
      recipientId: userId,
      targetType,
      targetId,
      targetContext,
      targetSummary,
    });
  }

  function handleClear() {
    clearNotifications();
    // Also wipe reaction, reply, and comment stores so the dev state fully resets.
    localStorage.removeItem('checkInReactions');
    localStorage.removeItem('checkInReplies');
    localStorage.removeItem('finishedMakeReactions');
    localStorage.removeItem('finishedMakeComments');
    setNotifications([]);
    setLog([]);
    setRawCheckInReactions({});
    setRawCheckInReplies([]);
    setRawMakeReactions({});
    setRawMakeComments([]);
  }

  if (!mounted) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="mx-auto max-w-3xl px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">🔔 Notifications Dev</h1>
          <p className="mt-1 text-sm text-slate-400">
            Simulate community interactions and verify notification behavior.
          </p>
        </div>

        {/* Current user status */}
        <section className="mb-6 rounded-xl bg-slate-800 p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Current User
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-slate-400">ID: </span>
              <span className="font-mono text-xs text-cyan-300">{userId}</span>
            </div>
            <div>
              <span className="text-slate-400">Name: </span>
              <span className="text-white">{displayName}</span>
            </div>
          </div>

          {/* Content targets */}
          <div className="mt-3 grid gap-2">
            <div className={`rounded-lg p-2.5 text-xs ${latestCheckIn ? 'bg-slate-700' : 'bg-yellow-900/40'}`}>
              <span className="font-semibold text-slate-300">Latest check-in: </span>
              {latestCheckIn
                ? <span className="text-slate-200">{truncate(latestCheckIn.message)} <span className="text-slate-500 font-mono ml-1">{latestCheckIn.id.slice(0, 12)}…</span></span>
                : <span className="text-yellow-400">⚠ None found — post a challenge update first</span>
              }
            </div>
            <div className={`rounded-lg p-2.5 text-xs ${latestMake ? 'bg-slate-700' : 'bg-yellow-900/40'}`}>
              <span className="font-semibold text-slate-300">Latest finished make: </span>
              {latestMake
                ? <span className="text-slate-200">{truncate(latestMake.caption ?? latestMake.displayName)} <span className="text-slate-500 font-mono ml-1">{latestMake.id.slice(0, 12)}…</span></span>
                : <span className="text-yellow-400">⚠ None found — submit a finished make first</span>
              }
            </div>
          </div>

          <button
            onClick={refresh}
            className="mt-3 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-600 transition-colors"
          >
            ↻ Refresh content detection
          </button>
        </section>

        {/* Mock user scenarios */}
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Simulate — Mock User Acts on Your Content
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            Expected: each button creates a notification for you.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <ScenarioButton
              label="Maya K. liked your update"
              sub="check_in_liked"
              color="blue"
              disabled={!latestCheckIn}
              onClick={() => mockLikesCheckIn(maya)}
            />
            <ScenarioButton
              label="Sam O. replied to your update"
              sub="check_in_replied"
              color="purple"
              disabled={!latestCheckIn}
              onClick={() => mockRepliesToCheckIn(sam)}
            />
            <ScenarioButton
              label="Jo A. liked your make"
              sub="make_liked"
              color="pink"
              disabled={!latestMake}
              onClick={() => mockLikesMake(jo)}
            />
            <ScenarioButton
              label="Maya K. commented on your make"
              sub="make_commented"
              color="amber"
              disabled={!latestMake}
              onClick={() => mockCommentsMake(maya)}
            />
            {/* Second actor — lets us verify multi-user like accumulation */}
            <ScenarioButton
              label="Jo A. also liked your update"
              sub="check_in_liked · 2nd actor"
              color="blue"
              disabled={!latestCheckIn}
              onClick={() => mockLikesCheckIn2(jo)}
            />
            <ScenarioButton
              label="Sam O. also liked your make"
              sub="make_liked · 2nd actor"
              color="pink"
              disabled={!latestMake}
              onClick={() => mockLikesMake2(sam)}
            />
          </div>
        </section>

        {/* Self-action scenarios */}
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Simulate — Self-Actions (should be blocked)
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            Expected: no notification is created — actor and recipient are the same user.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <ScenarioButton
              label="You liked your own update"
              sub="check_in_liked"
              color="slate"
              disabled={!latestCheckIn}
              onClick={() => selfAction('check_in_liked')}
            />
            <ScenarioButton
              label="You replied to your own update"
              sub="check_in_replied"
              color="slate"
              disabled={!latestCheckIn}
              onClick={() => selfAction('check_in_replied')}
            />
            <ScenarioButton
              label="You liked your own make"
              sub="make_liked"
              color="slate"
              disabled={!latestMake}
              onClick={() => selfAction('make_liked')}
            />
            <ScenarioButton
              label="You commented on your own make"
              sub="make_commented"
              color="slate"
              disabled={!latestMake}
              onClick={() => selfAction('make_commented')}
            />
          </div>
        </section>

        {/* Action log */}
        {log.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Action Log (this session)
            </h2>
            <div className="rounded-xl bg-slate-800 divide-y divide-slate-700 overflow-hidden">
              {log.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 px-3 py-2.5">
                  <span className={`mt-0.5 shrink-0 text-sm ${entry.blocked ? 'text-red-400' : 'text-green-400'}`}>
                    {entry.blocked ? '✗' : '✓'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white leading-snug">{entry.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      Actor: {entry.actor}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      Target: {entry.targetSummary}
                    </p>
                    {entry.blocked
                      ? <p className="text-xs text-red-400 mt-0.5 font-medium">Blocked — self-notification prevented</p>
                      : <p className="text-xs text-green-400 mt-0.5 font-medium">Notification created</p>
                    }
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-500 mt-0.5">{entry.ts}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Storage Inspector — shows actual persisted data so ID mismatches are visible */}
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Storage Inspector
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            Live view of what is actually written to localStorage. Updates after every action.
            Use this to confirm IDs match and data accumulates correctly.
          </p>

          {/* Check-in reactions */}
          <div className="mb-3 rounded-xl bg-slate-800 p-3">
            <p className="mb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              checkInReactions → target check-in
            </p>
            {latestCheckIn ? (
              <>
                <p className="text-[10px] font-mono text-cyan-400 mb-1 break-all">
                  key: <span className="text-white">{latestCheckIn.id || '(empty string — id missing!)'}</span>
                </p>
                {(() => {
                  const actors = (rawCheckInReactions as Record<string, unknown>)[latestCheckIn.id];
                  const arr = Array.isArray(actors) ? actors as string[] : null;
                  return arr ? (
                    <p className={`text-xs ${arr.length > 1 ? 'text-green-400' : 'text-slate-300'}`}>
                      {arr.length} reactor{arr.length !== 1 ? 's' : ''}: [{arr.map((id) => String(id).slice(0, 12)).join(', ')}]
                    </p>
                  ) : (
                    <p className="text-xs text-yellow-400">
                      No entry for this key — key is &quot;{latestCheckIn.id}&quot; but stored keys are: [{Object.keys(rawCheckInReactions).map((k) => `"${k.slice(0, 12)}"`).join(', ') || 'none'}]
                    </p>
                  );
                })()}
              </>
            ) : (
              <p className="text-xs text-yellow-500 italic">No target check-in detected.</p>
            )}
          </div>

          {/* Check-in replies */}
          <div className="mb-3 rounded-xl bg-slate-800 p-3">
            <p className="mb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              checkInReplies → target check-in
            </p>
            {latestCheckIn ? (
              <>
                <p className="text-[10px] font-mono text-cyan-400 mb-1 break-all">
                  checkInId filter: <span className="text-white">{latestCheckIn.id || '(empty string — id missing!)'}</span>
                </p>
                {rawCheckInReplies.length === 0 ? (
                  <p className="text-xs text-yellow-400">
                    No replies stored for this checkInId.{' '}
                    {(() => {
                      try {
                        const raw = localStorage.getItem('checkInReplies');
                        const all = raw ? JSON.parse(raw) : [];
                        const total = Array.isArray(all) ? all.length : 0;
                        const ids = Array.isArray(all)
                          ? [...new Set((all as Array<Record<string, unknown>>).map((r) => String(r?.checkInId ?? '').slice(0, 16)))]
                          : [];
                        return total > 0
                          ? `Total replies in store: ${total}. Stored checkInIds: [${ids.map((id) => `"${id}"`).join(', ')}]`
                          : 'checkInReplies store is empty.';
                      } catch { return ''; }
                    })()}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {rawCheckInReplies.map((r, i) => (
                      <div key={i} className="text-xs text-slate-200 border-t border-slate-700 pt-1 mt-1">
                        <span className="text-slate-400">{String(r.displayName ?? '?')}: </span>
                        {String(r.message ?? '').slice(0, 60)}
                        <span className="text-slate-600 ml-1 text-[10px]">{String(r.createdAt ?? '').slice(0, 16)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-yellow-500 italic">No target check-in detected.</p>
            )}
          </div>

          {/* Make reactions */}
          <div className="mb-3 rounded-xl bg-slate-800 p-3">
            <p className="mb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              finishedMakeReactions → target make
            </p>
            {latestMake ? (
              <>
                <p className="text-[10px] font-mono text-cyan-400 mb-1 break-all">
                  key: <span className="text-white">{latestMake.id}</span>
                </p>
                {(() => {
                  const actors = (rawMakeReactions as Record<string, unknown>)[latestMake.id];
                  const arr = Array.isArray(actors) ? actors as string[] : null;
                  return arr ? (
                    <p className={`text-xs ${arr.length > 1 ? 'text-green-400' : 'text-slate-300'}`}>
                      {arr.length} liker{arr.length !== 1 ? 's' : ''}: [{arr.map((id) => String(id).slice(0, 12)).join(', ')}]
                    </p>
                  ) : (
                    <p className="text-xs text-yellow-400">
                      No entry for this key — key is &quot;{latestMake.id}&quot; but stored keys are: [{Object.keys(rawMakeReactions).map((k) => `"${k.slice(0, 16)}"`).join(', ') || 'none'}]
                    </p>
                  );
                })()}
              </>
            ) : (
              <p className="text-xs text-yellow-500 italic">No target make detected.</p>
            )}
          </div>

          {/* Make comments */}
          <div className="rounded-xl bg-slate-800 p-3">
            <p className="mb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              finishedMakeComments → target make
            </p>
            {latestMake ? (
              <>
                <p className="text-[10px] font-mono text-cyan-400 mb-1 break-all">
                  makeId filter: <span className="text-white">{latestMake.id}</span>
                </p>
                {rawMakeComments.length === 0 ? (
                  <p className="text-xs text-yellow-400">
                    No comments stored for this makeId.{' '}
                    {(() => {
                      try {
                        const raw = localStorage.getItem('finishedMakeComments');
                        const all = raw ? JSON.parse(raw) : [];
                        const total = Array.isArray(all) ? all.length : 0;
                        const makeIds = Array.isArray(all)
                          ? [...new Set((all as Array<Record<string, unknown>>).map((c) => String(c?.makeId ?? '').slice(0, 16)))]
                          : [];
                        return total > 0
                          ? `Total comments in store: ${total}. Stored makeIds: [${makeIds.map((id) => `"${id}"`).join(', ')}]`
                          : 'finishedMakeComments store is empty.';
                      } catch { return ''; }
                    })()}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {rawMakeComments.map((c, i) => (
                      <div key={i} className="text-xs text-slate-200 border-t border-slate-700 pt-1 mt-1">
                        <span className="text-slate-400">{String(c.displayName ?? '?')}: </span>
                        {String(c.message ?? '').slice(0, 60)}
                        <span className="text-slate-600 ml-1 text-[10px]">{String(c.createdAt ?? '').slice(0, 16)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-yellow-500 italic">No target make detected.</p>
            )}
          </div>
        </section>

        {/* Notification inspector */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Notification Inspector ({notifications.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={refresh}
                className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-600 transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={handleClear}
                className="rounded-lg bg-red-800/60 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-700/60 transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="rounded-xl bg-slate-800 p-4 text-center text-sm text-slate-500 italic">
              No notifications for current user.
            </div>
          ) : (
            <div className="rounded-xl bg-slate-800 divide-y divide-slate-700 overflow-hidden">
              {notifications.map((n) => (
                <div key={n.id} className="px-3 py-2.5 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold text-white ${TYPE_COLORS[n.type]}`}>
                      {n.type}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${n.isRead ? 'bg-slate-700 text-slate-400' : 'bg-green-700 text-green-100'}`}>
                      {n.isRead ? 'read' : 'unread'}
                    </span>
                    <span className="text-slate-500 ml-auto">{relativeTime(n.createdAt)}</span>
                  </div>
                  <p className="text-slate-200">
                    <span className="font-semibold">{n.actorName}</span>
                    <span className="text-slate-500 font-mono"> ({n.actorId.slice(0, 14)}…)</span>
                  </p>
                  <p className="text-slate-400">
                    {n.targetType} · <span className="font-mono">{n.targetId.slice(0, 16)}…</span>
                    {n.targetContext && <span className="text-slate-500"> · ctx: {n.targetContext.slice(0, 16)}</span>}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <div className="text-center text-slate-500 text-sm">
          <p>🔧 This page is for development and testing only</p>
          <p className="mt-1 text-xs text-slate-600">
            All actions write to localStorage. Use "Clear all" to reset notification state.
          </p>
        </div>

      </div>
    </div>
  );
}

// ── Small sub-component ───────────────────────────────────────────────────────

type ButtonColor = 'blue' | 'purple' | 'pink' | 'amber' | 'slate';

const COLOR_MAP: Record<ButtonColor, string> = {
  blue:   'bg-blue-700 hover:bg-blue-600 disabled:bg-blue-900/40 disabled:text-blue-700',
  purple: 'bg-purple-700 hover:bg-purple-600 disabled:bg-purple-900/40 disabled:text-purple-700',
  pink:   'bg-pink-700 hover:bg-pink-600 disabled:bg-pink-900/40 disabled:text-pink-700',
  amber:  'bg-amber-700 hover:bg-amber-600 disabled:bg-amber-900/40 disabled:text-amber-700',
  slate:  'bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600',
};

function ScenarioButton({
  label,
  sub,
  color,
  disabled,
  onClick,
}: {
  label: string;
  sub: string;
  color: ButtonColor;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-3 py-3 text-left text-sm font-medium text-white transition-colors disabled:cursor-not-allowed ${COLOR_MAP[color]}`}
    >
      <span className="block leading-snug">{label}</span>
      <span className="mt-0.5 block text-[11px] font-mono opacity-60">{sub}</span>
    </button>
  );
}
