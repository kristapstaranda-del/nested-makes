'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type AuthUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import AuthPanel from '@/components/auth/AuthPanel';
import { projects as staticProjects } from '@/app/data/projects';
import { getUserProjects, normalizeUserProject, type DiscoverProject } from '@/lib/userProjects';
import { getProfileData } from '@/lib/profile';
import { getSupabaseProfile } from '@/lib/supabase/profiles';
import { getPublicCheckIns } from '@/lib/authorResolution';
import { getOrCreateUserId } from '@/lib/communityProfiles';
import { getActiveChallenges, type ActiveChallenge } from '@/lib/supabase/challenges';

type AuthState = 'loading' | 'logged-out' | 'logged-in';

export default function TodayPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeChallenges, setActiveChallenges] = useState<ActiveChallenge[]>([]);
  const [allProjects, setAllProjects] = useState<DiscoverProject[]>(staticProjects as DiscoverProject[]);
  const [profileName, setProfileName] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const [weeklyCheckInCount, setWeeklyCheckInCount] = useState(0);
  const [checkInsPerChallenge, setCheckInsPerChallenge] = useState<Record<string, number>>({});

  // Auth state: check session once, then subscribe to changes
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        setAuthState('logged-in');
      } else {
        setAuthState('logged-out');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/update-password');
        return;
      }
      if (session?.user) {
        setUser(session.user);
        setAuthState('logged-in');
      } else {
        setUser(null);
        setAuthState('logged-out');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load Supabase nickname — overrides localStorage when set
  useEffect(() => {
    if (authState !== 'logged-in' || !user) return;
    getSupabaseProfile(user.id).then((remote) => {
      if (remote?.nickname) setProfileName(remote.nickname);
    }).catch(() => {});
  }, [authState, user]);

  // Load Supabase + localStorage data once auth is confirmed
  useEffect(() => {
    if (authState !== 'logged-in') return;

    let cancelled = false;
    getActiveChallenges()
      .then((rows) => {
        if (!cancelled) setActiveChallenges(rows);
      })
      .catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[TodayPage] getActiveChallenges failed', err);
        }
      });

    const profile = getProfileData();
    setProfileName(profile.nickname || '');

    const userProjs = getUserProjects().map(normalizeUserProject);
    setAllProjects([...(staticProjects as DiscoverProject[]), ...userProjs]);

    // Check-in stats for momentum + per-challenge counts
    const userId = getOrCreateUserId();
    const allCheckIns = getPublicCheckIns();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().split('T')[0];

    setWeeklyCheckInCount(
      allCheckIns.filter((ci) => ci.authorId === userId && ci.date >= cutoff).length,
    );

    const perChallenge: Record<string, number> = {};
    allCheckIns
      .filter((ci) => ci.authorId === userId && ci.challengeId)
      .forEach((ci) => {
        if (ci.challengeId) perChallenge[ci.challengeId] = (perChallenge[ci.challengeId] ?? 0) + 1;
      });
    setCheckInsPerChallenge(perChallenge);

    return () => {
      cancelled = true;
    };
  }, [authState]);

  const handleLogout = async () => {
    setSignOutError('');
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);
    if (error) setSignOutError(error.message);
    // On success, onAuthStateChange fires and sets authState → 'logged-out'
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (authState === 'loading') {
    return <main className="min-h-screen bg-[var(--color-bg-canvas)]" />;
  }

  // ── Logged-out welcome screen ────────────────────────────────────────────────
  if (authState === 'logged-out') {
    return (
      <main className="min-h-screen bg-[var(--color-bg-canvas)]">
        <div className="mx-auto max-w-[430px] px-4 pt-10 pb-24">

          {/* Brand */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold text-[var(--color-text-primary)]">Nested Makes</h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">
              Keep track of your craft projects, join challenges, and share what you finish.
            </p>
          </div>

          {/* Value points */}
          <div className="mb-8 space-y-2.5">
            {[
              { icon: '🧶', text: 'Browse knitting, crochet, beading, and other craft ideas.' },
              { icon: '⚡', text: 'Join a challenge and add small progress updates.' },
              { icon: '✨', text: 'Post finished projects and see what others made.' },
            ].map(({ icon, text }) => (
              <div
                key={icon}
                className="flex items-start gap-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] px-4 py-3.5"
              >
                <span className="flex-none text-lg">{icon}</span>
                <p className="text-sm text-[var(--color-text-secondary)] leading-snug">{text}</p>
              </div>
            ))}
          </div>

          {/* Auth panel */}
          <AuthPanel />

        </div>
      </main>
    );
  }

  // ── Logged-in Today dashboard ────────────────────────────────────────────────
  const nickname = profileName || 'Maker';
  const featuredChallenge = activeChallenges[0] ?? null;
  const featuredProject = featuredChallenge
    ? allProjects.find((p) => String(p.id) === String(featuredChallenge.projectId)) ?? null
    : null;
  const featuredCheckInCount = featuredChallenge
    ? (checkInsPerChallenge[featuredChallenge.challengeId] ?? 0)
    : 0;
  // Extra challenges shown in "Continue making" (indices 1–2)
  const extraChallenges = activeChallenges.slice(1, 3);
  const overflowCount = activeChallenges.length - 3; // challenges beyond what's shown

  return (
    <main className="min-h-screen bg-[var(--color-bg-canvas)]">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24 space-y-6">

        {/* ── Greeting ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              Good to see you, {nickname}.
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              A little progress still counts.
            </p>
          </div>
          <button
            onClick={handleLogout}
            disabled={signingOut}
            className="mt-1 flex-none text-xs text-[var(--color-text-muted)] underline underline-offset-2 hover:text-[var(--color-text-secondary)] transition-colors disabled:opacity-50"
          >
            {signingOut ? 'Signing out…' : 'Log out'}
          </button>
        </div>
        {signOutError && (
          <p className="text-xs text-[var(--color-danger)]">{signOutError}</p>
        )}

        {/* ── Today's making focus ──────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Today&apos;s making focus
          </h2>

          {featuredChallenge ? (
            <div className="rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] px-5 py-4">
              {featuredProject ? (
                <>
                  <p className="text-xs text-[var(--color-text-muted)]">{featuredProject.craftType}</p>
                  <p className="mt-0.5 text-base font-semibold text-[var(--color-text-primary)]">
                    {featuredProject.title}
                  </p>
                </>
              ) : (
                <p className="text-base font-semibold text-[var(--color-text-primary)]">Active challenge</p>
              )}
              {featuredCheckInCount > 0 && (
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {featuredCheckInCount} update{featuredCheckInCount === 1 ? '' : 's'} so far
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <Link
                  href="/challenges"
                  className="flex-1 rounded-lg bg-[var(--color-brand-primary)] py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-primary-hover)]"
                >
                  Add check-in
                </Link>
                <Link
                  href="/challenges"
                  className="flex-1 rounded-lg border border-[var(--color-border-subtle)] py-2.5 text-center text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-brand-primary)] hover:text-[var(--color-text-primary)]"
                >
                  Open challenge
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] px-5 py-7 text-center">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                No active challenges yet
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Find a project and start one whenever you&apos;re ready.
              </p>
              <Link
                href="/discover"
                className="mt-4 inline-block rounded-lg bg-[var(--color-brand-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-primary-hover)]"
              >
                Discover projects
              </Link>
            </div>
          )}
        </section>

        {/* ── Continue making (only when there are extra challenges) ── */}
        {extraChallenges.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Continue making
            </h2>
            <div className="space-y-2">
              {extraChallenges.map((challenge) => {
                const project = allProjects.find((p) => String(p.id) === String(challenge.projectId));
                const count = checkInsPerChallenge[challenge.challengeId] ?? 0;
                return (
                  <Link key={challenge.challengeId} href="/challenges" className="block group">
                    <div className="flex items-center gap-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] px-4 py-3 transition-colors group-hover:border-[var(--color-brand-primary)]">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {project?.title ?? 'Challenge'}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          {[
                            project?.craftType,
                            count > 0 ? `${count} update${count === 1 ? '' : 's'}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      <span className="flex-none text-xs text-[var(--color-text-muted)] group-hover:text-[var(--color-brand-primary)] transition-colors">
                        →
                      </span>
                    </div>
                  </Link>
                );
              })}
              {overflowCount > 0 && (
                <Link
                  href="/challenges"
                  className="block pt-0.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                >
                  +{overflowCount} more challenge{overflowCount === 1 ? '' : 's'} →
                </Link>
              )}
            </div>
          </section>
        )}

        {/* ── Your momentum ─────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Your momentum
          </h2>
          <div className="rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] px-5 py-4">
            {weeklyCheckInCount > 0 ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[var(--color-brand-primary-soft)]">
                  <span className="text-base font-semibold text-[var(--color-brand-primary)]">
                    {weeklyCheckInCount}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  check-in{weeklyCheckInCount === 1 ? '' : 's'} this week.{' '}
                  <span className="text-[var(--color-text-muted)]">Keep going.</span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                No check-ins this week yet. Every stitch counts when you&apos;re ready.
              </p>
            )}
          </div>
        </section>

        {/* ── Quick actions ──────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Quick actions
          </h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/discover"
              className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-brand-primary)] hover:text-[var(--color-text-primary)]"
            >
              Discover projects
            </Link>
            <Link
              href="/challenges"
              className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-brand-primary)] hover:text-[var(--color-text-primary)]"
            >
              My challenges
            </Link>
            <Link
              href="/profile"
              className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-brand-primary)] hover:text-[var(--color-text-primary)]"
            >
              Edit profile
            </Link>
          </div>
        </section>

      </div>
    </main>
  );
}
