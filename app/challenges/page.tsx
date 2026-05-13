'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { projects } from '@/app/data/projects';
import { getUserProjects, normalizeUserProject, type DiscoverProject } from '@/lib/userProjects';
import { getOrCreateUserId, MOCK_PROFILES } from '@/lib/communityProfiles';
import { useMicroFeedback } from '@/hooks/useMicroFeedback';
import InlineFeedback from '@/components/feedback/InlineFeedback';
import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import ProgressBar from '@/components/ui/ProgressBar';
import HabitWeekTrack from '@/components/ui/HabitWeekTrack';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import ProjectCategoryIcon from '@/components/ui/ProjectCategoryIcon';
import ImageLightbox from '@/components/ui/ImageLightbox';
import { validateImageFile, fileToDataUrl, sanitizeCoverImage } from '@/lib/imageUtils';
import ReactionButton from '@/components/community/ReactionButton';
import ReplyThread from '@/components/community/ReplyThread';
import AuthorLink from '@/components/community/AuthorLink';
import { getPublicCheckIns } from '@/lib/authorResolution';
import { getCurrentHabitStreak } from '@/lib/habitStats';
import { getProfileData } from '@/lib/profile';
import { getAvatarById } from '@/lib/avatarLibrary';
import { supabase } from '@/lib/supabase/client';
import { getSupabaseProfile } from '@/lib/supabase/profiles';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import AuthRequiredPrompt from '@/components/auth/AuthRequiredPrompt';


interface Project {
  id: string;
  title: string;
  difficulty: string;
  craftType: string;
}


interface ChallengePlan {
  projectId: string;
  plan: {
    type: 'time_daily' | 'rows_daily' | 'days_per_week';
    target: number;
  };
}

interface ActiveChallenge {
  challengeId: string;
  projectId: string;
  plan: ChallengePlan['plan'] | null;
  createdAt: string;
}

interface CheckIn {
  id: string;
  challengeId?: string;
  projectId?: string;
  habitId?: string;
  date: string; // YYYY-MM-DD
  message: string;
  displayName: string;
  authorId?: string; // stable device ID for linking to public profile
  authorAvatarId?: string;
  imageUrl?: string; // optional base64 data URL for progress photo
}

interface HabitLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  status: 'done' | 'missed';
}

export default function ChallengesPage() {
  const [activeChallenges, setActiveChallenges] = useState<ActiveChallenge[]>([]);
  const [archivedChallenges, setArchivedChallenges] = useState<ActiveChallenge[]>([]);
  const [showAllArchived, setShowAllArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // Merged project lookup: static curated + user-created (populated in useEffect)
  const [allProjects, setAllProjects] = useState<DiscoverProject[]>(projects as DiscoverProject[]);
  const [authorName, setAuthorName] = useState('Maker');
  const [authorAvatarId, setAuthorAvatarId] = useState<string | undefined>(undefined);
  const { status: authStatus } = useAuthStatus();

  const [checkInsByChallenge, setCheckInsByChallenge] = useState<Record<string, CheckIn[]>>({});
  const [checkInMessages, setCheckInMessages] = useState<Record<string, string>>({});
  const [checkInImages, setCheckInImages] = useState<Record<string, string>>({});
  const [checkInImageErrors, setCheckInImageErrors] = useState<Record<string, string>>({});
  const [updatesExpanded, setUpdatesExpanded] = useState<Record<string, boolean>>({});
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const checkInImageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [activeHabit, setActiveHabit] = useState<{
    habitId: string;
    plan: { type: 'time_daily' | 'rows_daily' | 'days_per_week'; target: number };
    createdAt: string;
  } | null>(null);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const { currentFeedback, showFeedback, dismissFeedback } = useMicroFeedback();

  // helper to create a unique ID, used by migrations and check-ins
  const generateId = (): string => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return Date.now().toString();
  };

  const formatToday = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  const getWeekStartMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const isInCurrentWeek = (dateStr: string): boolean => {
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3) return false;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const now = new Date();
    const start = getWeekStartMonday(now);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return d >= start && d <= end;
  };

  const getWeeklyCount = (items: { date: string }[]): number => {
    const dates = new Set<string>();
    items.forEach((item) => {
      if (isInCurrentWeek(item.date)) {
        dates.add(item.date);
      }
    });
    return dates.size;
  };

  // for habit logs, only count "done" entries
  const getHabitWeeklyCount = (habitId: string): number => {
    const dates = new Set<string>();
    habitLogs
      .filter((log) => log.habitId === habitId && log.status === 'done')
      .forEach((log) => {
        if (isInCurrentWeek(log.date)) {
          dates.add(log.date);
        }
      });
    return dates.size;
  };

  // Get the 7 days of current week (Mon-Sun) with their status
  const getWeeklyHabitDays = (habitId: string): Array<{ date: string; status: 'done' | 'missed' | 'empty' }> => {
    const now = new Date();
    const start = getWeekStartMonday(now);
    const days: Array<{ date: string; status: 'done' | 'missed' | 'empty' }> = [];

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const log = habitLogs.find((l) => l.habitId === habitId && l.date === dateStr);
      days.push({
        date: dateStr,
        status: log ? log.status : 'empty',
      });
    }

    return days;
  };


  // Load author identity: localStorage first, then Supabase override for logged-in users
  useEffect(() => {
    const profile = getProfileData();
    setAuthorName(profile.nickname || 'Maker');
    setAuthorAvatarId(profile.avatarId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled || !data.user) return;
      try {
        const remote = await getSupabaseProfile(data.user.id);
        if (cancelled || !remote) return;
        if (remote.nickname) setAuthorName(remote.nickname);
        if (remote.avatar_id) setAuthorAvatarId(remote.avatar_id);
      } catch {}
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // === migration logic for active challenge storage ===
    const migrateAndReadActive = () => {
      // try new format first
      const existing = localStorage.getItem('activeChallenges');
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          if (
            Array.isArray(parsed) &&
            parsed.every(
              (c) =>
                c &&
                typeof c.challengeId === 'string' &&
                typeof c.projectId === 'string' &&
                typeof c.createdAt === 'string'
            )
          ) {
            return parsed as ActiveChallenge[];
          }
        } catch (e) {
          // ignore parse errors and fall through to migration
        }
      }

      // new format was missing or invalid, attempt to migrate old key
      const old = localStorage.getItem('activeChallenge');
      if (old) {
        let projectId: string | undefined;
        let plan: ChallengePlan['plan'] | null = null;
        try {
          const parsedOld = JSON.parse(old);
          if (parsedOld && typeof parsedOld === 'object') {
            projectId = parsedOld.projectId || undefined;
            plan = parsedOld.plan || null;
          }
        } catch (e) {
          // could be a plain string saved earlier
          projectId = old;
        }

        if (projectId) {
          const today = new Date().toISOString().split('T')[0];
          const newEntry: ActiveChallenge = {
            challengeId: generateId(),
            projectId,
            plan,
            createdAt: today,
          };
          const arr = [newEntry];
          try {
            localStorage.setItem('activeChallenges', JSON.stringify(arr));
            localStorage.removeItem('activeChallenge');
          } catch (e) {
            // ignore storage errors
          }
          return arr;
        }
      }

      return null;
    };

    const activeArr = migrateAndReadActive() || [];
    setActiveChallenges(activeArr);

    // load archived challenges
    let arch: ActiveChallenge[] = [];
    const archRaw = localStorage.getItem('archivedChallenges');
    if (archRaw) {
      try {
        const parsed = JSON.parse(archRaw);
        if (Array.isArray(parsed)) {
          arch = parsed;
        }
      } catch {
        arch = [];
      }
    }
    setArchivedChallenges(arch);

    // === migration logic: move habit entries from publicCheckIns to habitLogs ===
    try {
      const publicCheckInsRaw = localStorage.getItem('publicCheckIns');
      let allCheckIns: CheckIn[] = [];
      if (publicCheckInsRaw) {
        try {
          allCheckIns = JSON.parse(publicCheckInsRaw);
        } catch {
          allCheckIns = [];
        }
      }

      // filter out habit entries (those with habitId)
      const habitEntries = allCheckIns.filter((ci) => ci.habitId);
      
      if (habitEntries.length > 0) {
        // remove habit entries from publicCheckIns
        const projectOnlyCheckIns = allCheckIns.filter((ci) => !ci.habitId);
        localStorage.setItem('publicCheckIns', JSON.stringify(projectOnlyCheckIns));
      }
    } catch (e) {
      // ignore migration errors, don't crash
    }

    // === migration: convert old privateHabitLogs to new habitLogs with status ===
    try {
      let habitLogsArr: HabitLog[] = [];
      const habitLogsRaw = localStorage.getItem('habitLogs');
      
      if (habitLogsRaw) {
        // new format already exists, use it
        try {
          habitLogsArr = JSON.parse(habitLogsRaw);
        } catch {
          habitLogsArr = [];
        }
      } else {
        // check if old privateHabitLogs exists and migrate
        const privateLogsRaw = localStorage.getItem('privateHabitLogs');
        if (privateLogsRaw) {
          try {
            const oldLogs: any[] = JSON.parse(privateLogsRaw);
            habitLogsArr = oldLogs.map((log) => ({
              id: log.id,
              habitId: log.habitId,
              date: log.date,
              status: 'done' as const,
            }));
            // save to new format
            localStorage.setItem('habitLogs', JSON.stringify(habitLogsArr));
          } catch {
            habitLogsArr = [];
          }
        }
      }
      
      setHabitLogs(habitLogsArr);
    } catch (e) {
      // ignore migration errors, don't crash
    }

    // load public check-ins (project-only) — authorId resolved via backfill
    let all: CheckIn[] = getPublicCheckIns() as CheckIn[];

    // backwards-compat: assign missing challengeId to first active challenge
    if (all.length && activeArr.length) {
      const firstId = activeArr[0].challengeId;
      all = all.map((ci) =>
        ci.challengeId ? ci : { ...ci, challengeId: firstId }
      );
    }

    const map: Record<string, CheckIn[]> = {};
    all.forEach((ci) => {
      if (!ci.challengeId) return;
      if (!map[ci.challengeId]) map[ci.challengeId] = [];
      map[ci.challengeId].push(ci);
    });
    setCheckInsByChallenge(map);

    // load active habit separately
    const habitRaw = localStorage.getItem('activeHabit');
    if (habitRaw) {
      try {
        const h = JSON.parse(habitRaw);
        if (
          h &&
          typeof h.habitId === 'string' &&
          h.plan &&
          typeof h.plan.type === 'string' &&
          typeof h.plan.target === 'number'
        ) {
          setActiveHabit(h);
        }
      } catch {}
    }

    // Check if a challenge was just created and show join feedback
    const showJoinedFeedback = localStorage.getItem('__showChallengeJoinedFeedback');
    if (showJoinedFeedback) {
      try {
        localStorage.removeItem('__showChallengeJoinedFeedback');
        setTimeout(() => {
          showFeedback('challenge_joined');
        }, 100);
      } catch {}
    }

    // Check if a habit was just created and show startup feedback
    const showHabitStartedFeedback = localStorage.getItem('__showHabitStartedFeedback');
    if (showHabitStartedFeedback) {
      try {
        localStorage.removeItem('__showHabitStartedFeedback');
        setTimeout(() => {
          showFeedback('habit_started');
        }, 100);
      } catch {}
    }

    // Check if a challenge plan was just updated
    const showChallengeUpdatedFeedback = localStorage.getItem('__showChallengeUpdatedFeedback');
    if (showChallengeUpdatedFeedback) {
      try {
        localStorage.removeItem('__showChallengeUpdatedFeedback');
        setTimeout(() => {
          showFeedback('challenge_updated');
        }, 100);
      } catch {}
    }

    // Check if a finished make was just submitted
    const showFinishedMakeFeedback = localStorage.getItem('__showFinishedMakeFeedback');
    if (showFinishedMakeFeedback) {
      try {
        localStorage.removeItem('__showFinishedMakeFeedback');
        setTimeout(() => {
          showFeedback('finished_make_submitted');
        }, 100);
      } catch {}
    }

    // Merge static projects with user-created projects for challenge card lookups
    const userProjs = getUserProjects().map(normalizeUserProject);
    setAllProjects([...(projects as DiscoverProject[]), ...userProjs]);

    setIsLoading(false);
  }, [showFeedback]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-green-100 text-green-700';
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-700';
      case 'Advanced':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };


  const formatPlan = (planData: ChallengePlan['plan'] | null): string => {
    if (!planData) return '';
    switch (planData.type) {
      case 'time_daily':
        return `Plan: ${planData.target} min/day`;
      case 'rows_daily':
        return `Plan: ${planData.target} rows/day`;
      case 'days_per_week':
        return `Plan: ${planData.target} days/week`;
    }
  };

  const archiveChallenge = (challengeId: string) => {
    if (!window.confirm('Are you sure you want to archive this challenge?')) return;
    // remove from state
    setActiveChallenges((prev) => prev.filter((c) => c.challengeId !== challengeId));

    // update localStorage activeChallenges
    try {
      const existing = localStorage.getItem('activeChallenges');
      let arr: any[] = [];
      if (existing) {
        arr = JSON.parse(existing) || [];
      }
      const idx = arr.findIndex((c) => c.challengeId === challengeId);
      let removed: any = null;
      if (idx !== -1) {
        removed = arr.splice(idx, 1)[0];
        localStorage.setItem('activeChallenges', JSON.stringify(arr));
      }
      if (removed) {
        const archivedRaw = localStorage.getItem('archivedChallenges');
        let archived: any[] = [];
        if (archivedRaw) {
          try {
            archived = JSON.parse(archivedRaw) || [];
          } catch {}
        }
        archived.push(removed);
        localStorage.setItem('archivedChallenges', JSON.stringify(archived));
      }
    } catch (e) {
      // ignore errors
    }

    // Show achievement-aware feedback
    showFeedback('challenge_archived');
  };

  const restoreChallenge = (challenge: ActiveChallenge) => {
    // move from archived -> active
    setArchivedChallenges((prev) => prev.filter((c) => c.challengeId !== challenge.challengeId));
    setActiveChallenges((prev) => [...prev, challenge]);

    try {
      const archRaw = localStorage.getItem('archivedChallenges');
      let archArr: any[] = [];
      if (archRaw) {
        archArr = JSON.parse(archRaw) || [];
      }
      const idx = archArr.findIndex((c) => c.challengeId === challenge.challengeId);
      if (idx !== -1) {
        archArr.splice(idx, 1);
        localStorage.setItem('archivedChallenges', JSON.stringify(archArr));
      }
    } catch {}

    try {
      const activeRaw = localStorage.getItem('activeChallenges');
      let actArr: any[] = [];
      if (activeRaw) actArr = JSON.parse(activeRaw) || [];
      actArr.push(challenge);
      localStorage.setItem('activeChallenges', JSON.stringify(actArr));
    } catch {}
  };





  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
          <h1 className="text-3xl font-bold text-neutral-900">Challenges</h1>
        </div>
      </div>
    );
  }


  const today = formatToday();

  // convenience for empty check
  const noActive = activeChallenges.length === 0;
  const hasArchived = archivedChallenges.length > 0;
  const ARCHIVED_PREVIEW = 3;
  const hasArchivedOverflow = archivedChallenges.length > ARCHIVED_PREVIEW;
  const visibleArchivedChallenges = showAllArchived
    ? archivedChallenges
    : archivedChallenges.slice(0, ARCHIVED_PREVIEW);
  const habitWeeklyCount = activeHabit ? getHabitWeeklyCount(activeHabit.habitId) : 0;
  const todayHabitLog = activeHabit ? habitLogs.find((log) => log.habitId === activeHabit.habitId && log.date === today) : null;

  const activeContent = noActive ? (
    <EmptyState
      title="No active challenges yet"
      description="Choose a project from Discover to begin a calm, steady creative routine."
      action={
        <Link href="/discover">
          <Button variant="primary">Discover Projects</Button>
        </Link>
      }
    />
  ) : (
    activeChallenges.map((challenge) => {
      const project = allProjects.find((p) => String(p.id) === String(challenge.projectId));
      const ins = checkInsByChallenge[challenge.challengeId] || [];
      const completedToday = ins.some((ci) => ci.date === today);
      const weeklyCount = getWeeklyCount(ins);
      if (!project) return null;
      return (
        <Card key={challenge.challengeId} className="mt-6">
          {/* Header: icon/image + title + category — mirrors project detail layout */}
          <div className="flex items-start gap-3">
            {project.coverImage
              ? (
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[var(--color-bg-soft)] shrink-0">
                  <img src={project.coverImage} alt={project.title} className="h-full w-full object-cover" loading="lazy" />
                </div>
              )
              : <ProjectCategoryIcon category={project.craftType} size="lg" />
            }
            <div className="flex-1 min-w-0">
              <Link href={`/projects/${challenge.projectId}`}>
                <h2 className="text-xl font-bold leading-snug text-[var(--color-text-primary)] hover:text-[var(--color-brand-primary)] transition-colors">
                  {project.title}
                </h2>
              </Link>
              <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{project.craftType}</p>
            </div>
          </div>

          {/* Chips + plan text */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Chip
              label={project.difficulty}
              variant={
                project.difficulty.toLowerCase() === 'beginner'
                  ? 'success'
                  : project.difficulty.toLowerCase() === 'intermediate'
                  ? 'primary'
                  : 'warning'
              }
            />
            {challenge.plan && (
              <span className="text-xs font-medium text-[var(--color-brand-secondary)]">
                {formatPlan(challenge.plan)}
              </span>
            )}
          </div>

          {/* Weekly progress */}
          {challenge.plan && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                This week: {weeklyCount} / {challenge.plan.type === 'days_per_week' ? challenge.plan.target : 7} days
              </p>
              <ProgressBar
                value={Math.min(1, weeklyCount / (challenge.plan.type === 'days_per_week' ? challenge.plan.target : 7))}
                label="Weekly progress"
              />
              <p className="text-xs text-[var(--color-text-secondary)]">
                {challenge.plan.type === 'days_per_week'
                  ? 'Keep moving toward your weekly habit.'
                  : 'Stay consistent to make steady momentum.'}
              </p>
            </div>
          )}

          {/* Check-in input */}
          <div className="mt-5">
            {authStatus === 'loading' ? (
              <div className="h-24 rounded-lg bg-[var(--color-bg-soft)] animate-pulse" />
            ) : authStatus === 'anonymous' ? (
              <AuthRequiredPrompt
                title="Create an account to post an update."
                description="Your update will be shown with your maker name and avatar."
              />
            ) : (
              <>
                <label className="block text-sm font-semibold text-[var(--color-text-primary)]">
                  How did it go today?
                </label>
                <textarea
                  value={checkInMessages[challenge.challengeId] || ''}
                  onChange={(e) => {
                    const text = e.target.value;
                    if (text.length <= 200) {
                      setCheckInMessages((m) => ({ ...m, [challenge.challengeId]: text }));
                    }
                  }}
                  disabled={completedToday}
                  placeholder="Share a quick update… (optional)"
                  className="mt-2 w-full rounded-lg border border-[var(--color-border-subtle)] bg-white p-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] disabled:bg-[var(--color-bg-soft)] disabled:text-[var(--color-text-muted)]"
                  rows={3}
                />
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {(checkInMessages[challenge.challengeId] || '').length}/200
                  </span>
                  {!completedToday && (
                    <button
                      type="button"
                      onClick={() => checkInImageInputRefs.current[challenge.challengeId]?.click()}
                      className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-brand-primary)] transition-colors"
                    >
                      + photo
                    </button>
                  )}
                </div>
                <input
                  ref={(el) => { checkInImageInputRefs.current[challenge.challengeId] = el; }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) handleCheckInImageSelect(challenge.challengeId, file);
                  }}
                />
                {checkInImages[challenge.challengeId] && (
                  <div className="mt-2 relative inline-block">
                    <img
                      src={checkInImages[challenge.challengeId]}
                      alt="Preview"
                      className="h-16 w-16 rounded-lg object-cover border border-[var(--color-border-subtle)]"
                    />
                    <button
                      type="button"
                      onClick={() => setCheckInImages((imgs) => { const next = { ...imgs }; delete next[challenge.challengeId]; return next; })}
                      className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-danger)] text-xs text-white leading-none"
                    >
                      ×
                    </button>
                  </div>
                )}
                {checkInImageErrors[challenge.challengeId] && (
                  <p className="mt-1 text-xs text-[var(--color-danger)]">{checkInImageErrors[challenge.challengeId]}</p>
                )}
                <div className="mt-3">
                  <Button
                    variant="primary"
                    onClick={() => handleCheckInSubmit(challenge)}
                    disabled={completedToday}
                    className="w-full"
                  >
                    {completedToday ? 'Already completed today' : 'Complete Today'}
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Community check-ins */}
          {ins.length > 0 && (() => {
            const sorted = [...ins].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const isExpanded = updatesExpanded[challenge.challengeId] ?? false;
            const visible = isExpanded ? sorted : sorted.slice(0, 2);
            const hasMore = sorted.length > 2;
            return (
              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between px-0.5">
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {sorted.length === 1 ? '1 update' : `${sorted.length} updates`} on this challenge
                  </p>
                  {hasMore && (
                    <Link
                      href={`/challenges/${challenge.challengeId}/updates`}
                      className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                    >
                      View all →
                    </Link>
                  )}
                </div>
                {visible.map((ci) => {
                  const safeImage = sanitizeCoverImage(ci.imageUrl);
                  const ciAvatar = getAvatarById(ci.authorAvatarId);
                  const ciInitials = ci.displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') || '?';
                  return (
                    <div key={ci.id} className="rounded-xl bg-[var(--color-bg-soft)] px-3.5 py-3">
                      {/* Author + date */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {ciAvatar ? (
                            <img src={ciAvatar.imageSrc} alt={ciAvatar.id} className="h-6 w-6 rounded-full object-cover flex-none" />
                          ) : (
                            <div className="h-6 w-6 rounded-full flex-none flex items-center justify-center text-[10px] font-semibold text-white bg-[#6E8F7A]">
                              {ciInitials}
                            </div>
                          )}
                          <AuthorLink authorId={ci.authorId} displayName={ci.displayName} />
                        </div>
                        <span className="text-[10px] text-[var(--color-text-muted)] flex-none">
                          {new Date(ci.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      {/* Content */}
                      {ci.message ? (
                        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                          {ci.message.length > 120 ? ci.message.slice(0, 120) + '…' : ci.message}
                        </p>
                      ) : !safeImage && (
                        <p className="text-sm text-[var(--color-text-muted)] italic">Made a little progress today.</p>
                      )}
                      {/* Image */}
                      {safeImage && (
                        <button
                          type="button"
                          onClick={() => setLightboxImage(safeImage)}
                          className={`block w-full overflow-hidden rounded-lg ${ci.message ? 'mt-2.5' : 'mt-1'}`}
                        >
                          <img
                            src={safeImage}
                            alt="Check-in photo"
                            className="w-full max-h-48 object-cover"
                            loading="lazy"
                          />
                        </button>
                      )}
                      {/* Reactions */}
                      <div className="mt-2.5 pt-2 border-t border-[var(--color-border-subtle)]">
                        <ReactionButton checkInId={ci.id} />
                      </div>
                      {/* Replies */}
                      <ReplyThread checkInId={ci.id} compact challengeId={challenge.challengeId} />
                    </div>
                  );
                })}
                {hasMore && (
                  <button
                    type="button"
                    onClick={() =>
                      setUpdatesExpanded((prev) => ({ ...prev, [challenge.challengeId]: !isExpanded }))
                    }
                    className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                  >
                    {isExpanded
                      ? 'Show less'
                      : `See ${sorted.length - 2} more update${sorted.length - 2 === 1 ? '' : 's'}`}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Actions */}
          <div className="mt-4 flex items-center gap-3 border-t border-[var(--color-border-subtle)] pt-3">
            <Link
              href={`/challenges/setup?projectId=${challenge.projectId}&challengeId=${challenge.challengeId}`}
              className="text-sm font-medium text-[var(--color-brand-secondary)] hover:text-[var(--color-brand-secondary-hover)]"
            >
              Edit plan
            </Link>
            <Link
              href={`/makes/new?projectId=${challenge.projectId}&challengeId=${challenge.challengeId}`}
              className="text-sm font-medium text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)]"
            >
              I finished this
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
              onClick={() => archiveChallenge(challenge.challengeId)}
            >
              Archive
            </Button>
          </div>
        </Card>
      );
    })
  );

  const handleCheckInImageSelect = async (challengeId: string, file: File) => {
    const error = validateImageFile(file);
    if (error) {
      setCheckInImageErrors((e) => ({ ...e, [challengeId]: error }));
      return;
    }
    setCheckInImageErrors((e) => ({ ...e, [challengeId]: '' }));
    try {
      const dataUrl = await fileToDataUrl(file);
      setCheckInImages((imgs) => ({ ...imgs, [challengeId]: dataUrl }));
    } catch {
      setCheckInImageErrors((e) => ({ ...e, [challengeId]: 'Could not read that image. Try another.' }));
    }
  };

  const handleCheckInSubmit = (challenge: ActiveChallenge) => {
    const msg = (checkInMessages[challenge.challengeId] || '').trim();

    const existingList = checkInsByChallenge[challenge.challengeId] || [];
    if (existingList.some((ci) => ci.date === today)) {
      // already done today
      return;
    }

    const newCheckIn: CheckIn = {
      id: generateId(),
      challengeId: challenge.challengeId,
      projectId: challenge.projectId,
      date: today,
      message: msg,
      displayName: authorName,
      authorId: getOrCreateUserId(),
      authorAvatarId: authorAvatarId,
      imageUrl: checkInImages[challenge.challengeId] || undefined,
    };

    // persist globally
    let all: CheckIn[] = [];
    const saved = localStorage.getItem('publicCheckIns');
    if (saved) {
      try {
        all = JSON.parse(saved);
      } catch {}
    }
    all.push(newCheckIn);
    try {
      localStorage.setItem('publicCheckIns', JSON.stringify(all));
    } catch {}

    // update local state
    setCheckInsByChallenge((map) => ({
      ...map,
      [challenge.challengeId]: [newCheckIn, ...(map[challenge.challengeId] || [])],
    }));
    setCheckInMessages((m) => ({ ...m, [challenge.challengeId]: '' }));
    setCheckInImages((imgs) => { const next = { ...imgs }; delete next[challenge.challengeId]; return next; });
    setCheckInImageErrors((e) => ({ ...e, [challenge.challengeId]: '' }));

    // Show achievement-aware feedback for public check-in
    showFeedback('public_checkin_created');
  };

  const handleHabitStatus = (status: 'done' | 'missed') => {
    if (!activeHabit || todayHabitLog) return;

    const newLog: HabitLog = {
      id: generateId(),
      habitId: activeHabit.habitId,
      date: today,
      status,
    };

    // persist to habitLogs
    const allLogs = [...habitLogs, newLog];
    try {
      localStorage.setItem('habitLogs', JSON.stringify(allLogs));
    } catch {}

    setHabitLogs(allLogs);

    // Show micro-feedback with smart achievement detection
    if (status === 'done') {
      const streak = getCurrentHabitStreak();
      // Detect bounce-back: most recent prior log for this habit was missed.
      // Read from pre-save habitLogs state (today's log not yet in React state).
      const prevLog = habitLogs
        .filter((log) => log.habitId === activeHabit.habitId)
        .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      const bounceBack = prevLog?.status === 'missed';
      showFeedback('habit_done', { streak, bounceBack });
    } else {
      showFeedback('habit_missed');
    }
  };

  const clearHabit = () => {
    if (!activeHabit) return;
    if (!window.confirm('Remove active habit?')) return;
    localStorage.removeItem('activeHabit');
    
    // also remove all logs for this habit from habitLogs
    try {
      const remaining = habitLogs.filter(log => log.habitId !== activeHabit.habitId);
      localStorage.setItem('habitLogs', JSON.stringify(remaining));
    } catch {}
    
    setActiveHabit(null);
    setHabitLogs((prev) => prev.filter(log => log.habitId !== activeHabit.habitId));
    dismissFeedback();
  };

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
        <SectionHeader
          title="Challenges"
          subtitle="Your active projects live here. Keep going — small progress still counts."
        />

        {/* Page-level micro-feedback — shown for all feedback types regardless of which section is visible */}
        {currentFeedback && (
          <div className="mt-4">
            <InlineFeedback feedback={currentFeedback} onDismiss={dismissFeedback} />
          </div>
        )}

        {/* Author identity — sourced from Profile */}
        {(() => {
          const avatar = getAvatarById(authorAvatarId);
          const initials = authorName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') || null;
          return (
            <div className="mt-4 flex items-center gap-2">
              {avatar ? (
                <img src={avatar.imageSrc} alt={avatar.id} className="h-6 w-6 rounded-full object-cover flex-none" />
              ) : initials ? (
                <div className="h-6 w-6 rounded-full flex-none flex items-center justify-center text-[10px] font-semibold text-white bg-[#6E8F7A]">
                  {initials}
                </div>
              ) : null}
              <p className="text-xs text-[var(--color-text-muted)]">
                Posting as <span className="font-medium text-[var(--color-text-secondary)]">{authorName}</span>
              </p>
            </div>
          );
        })()}

        {activeContent}

        {/* habit section */}
        {activeHabit ? (
          <Card className="mt-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Daily Habit</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Your private habit lives here. One day at a time, no pressure.
                </p>
              </div>

              <div className="rounded-xl bg-[var(--color-bg-soft)] p-4">
                <p className="text-base font-semibold text-[var(--color-text-primary)]">
                  {activeHabit.plan.type === 'time_daily'
                    ? `${activeHabit.plan.target} min/day`
                    : activeHabit.plan.type === 'rows_daily'
                    ? `${activeHabit.plan.target} rows/day`
                    : `${activeHabit.plan.target} days/week`}
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {activeHabit.plan.type === 'days_per_week'
                    ? 'Consistency is your friend.'
                    : 'A small step is still momentum.'}
                </p>
              </div>

              <HabitWeekTrack
                days={getWeeklyHabitDays(activeHabit.habitId)}
                target={activeHabit.plan.type === 'days_per_week' ? activeHabit.plan.target : 7}
                completed={habitWeeklyCount}
              />

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="primary"
                  onClick={() => handleHabitStatus('done')}
                  disabled={!!todayHabitLog}
                >
                  {todayHabitLog?.status === 'done' ? 'Done today ✅' : 'Did it today'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleHabitStatus('missed')}
                  disabled={!!todayHabitLog}
                >
                  {todayHabitLog?.status === 'missed' ? 'Missed today' : 'Missed today'}
                </Button>
              </div>

              <p className="text-xs text-[var(--color-text-secondary)]">Missed days happen. You can pick it up again when you’re ready.</p>

              <div className="mt-4 flex items-center justify-between">
                <Link
                  href="/habits/setup"
                  className="text-xs font-medium text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)] underline"
                >
                  Edit habit
                </Link>
                <button
                  onClick={clearHabit}
                  className="text-xs font-medium text-red-600 hover:text-red-700 underline"
                >
                  Remove habit
                </button>
              </div>
            </div>
          </Card>
        ) : (
          <EmptyState
            title="No active habit yet"
            description="Start a small daily habit—your progress is private and personal."
            action={
              <Link href="/habits/setup">
                <Button variant="primary">Create daily habit</Button>
              </Link>
            }
          />
        )}

        {/* archived section */}
        <div className="mt-10">
          <SectionHeader
            title="Archived Challenges"
            subtitle="Finished or paused challenges stay here as part of your progress story."
          />

          <div className="mt-4 space-y-3">
            {hasArchived ? (
              <>
                {visibleArchivedChallenges.map((challenge) => {
                  const project = allProjects.find((p) => String(p.id) === String(challenge.projectId));
                  if (!project) return null;
                  return (
                    <Card key={challenge.challengeId} className="bg-[var(--color-bg-soft)]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <ProjectCategoryIcon category={project.craftType} size="sm" />
                          <div>
                            <Link
                              href={`/projects/${challenge.projectId}`}
                              className="font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-brand-primary)] transition-colors"
                            >
                              {project.title}
                            </Link>
                            <p className="text-xs text-[var(--color-text-secondary)]">{project.craftType}</p>
                          </div>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => restoreChallenge(challenge)}>
                          Restore
                        </Button>
                      </div>
                    </Card>
                  );
                })}
                {hasArchivedOverflow && (
                  <button
                    type="button"
                    onClick={() => setShowAllArchived((v) => !v)}
                    className="w-full pt-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                  >
                    {showAllArchived
                      ? 'Show less'
                      : `See all archived (${archivedChallenges.length})`}
                  </button>
                )}
              </>
            ) : (
              <EmptyState
                title="No archived challenges yet"
                description="Completed challenges will appear here as part of your progress history."
              />
            )}
          </div>
        </div>

        {/* Community section */}
        <div className="mt-10">
          <SectionHeader
            title="Community"
            subtitle="A few crafters making progress. Tap a name to see their profile."
          />
          <div className="mt-4 space-y-3">
            {MOCK_PROFILES.map((member) => {
              const initials = member.displayName
                .split(' ')
                .map((w) => w.charAt(0).toUpperCase())
                .join('')
                .slice(0, 2);
              const latestUpdate = member.recentCheckIns[0];
              return (
                <Link key={member.id} href={`/community/${member.id}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-sm font-semibold text-white"
                        style={{ backgroundColor: member.avatarColor ?? '#6E8F7A' }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                          {member.displayName}
                        </p>
                        {latestUpdate && (
                          <p className="mt-0.5 text-xs text-[var(--color-text-muted)] truncate">
                            {latestUpdate.message.slice(0, 55)}{latestUpdate.message.length > 55 ? '…' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    {lightboxImage && (
      <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
    )}
    </div>
  );
}
