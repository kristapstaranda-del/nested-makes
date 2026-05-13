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

interface ActiveChallenge {
  challengeId: string;
  projectId: string;
  createdAt: string;
}

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

  // Load Supabase display_name — overrides localStorage name when set
  useEffect(() => {
    if (authState !== 'logged-in' || !user) return;
    getSupabaseProfile(user.id).then((remote) => {
      if (remote?.nickname) setProfileName(remote.nickname);
    }).catch(() => {});
  }, [authState, user]);

  // Load localStorage data once auth is confirmed
  useEffect(() => {
    if (authState !== 'logged-in') return;

    try {
      const raw = localStorage.getItem('activeChallenges');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setActiveChallenges(
            parsed.filter(
              (c): c is ActiveChallenge =>
                c !== null &&
                typeof c === 'object' &&
                typeof c.challengeId === 'string' &&
                typeof c.projectId === 'string',
            ),
          );
        }
      }
    } catch {}

    const profile = getProfileData();
    setProfileName(profile.nickname || '');

    const userProjs = getUserProjects().map(normalizeUserProject);
    setAllProjects([...(staticProjects as DiscoverProject[]), ...userProjs]);
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
  const visibleChallenges = activeChallenges.slice(0, 2);
  const greeting = profileName || null;

  return (
    <main className="min-h-screen bg-[var(--color-bg-canvas)]">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Today</h1>
            <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
              {greeting ? `Good to see you, ${greeting}.` : 'Welcome back.'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            disabled={signingOut}
            className="mt-1 flex-none text-xs text-[var(--color-text-secondary)] underline underline-offset-2 hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50"
          >
            {signingOut ? 'Signing out…' : 'Log out'}
          </button>
        </div>
        {signOutError && (
          <p className="mb-4 text-xs text-[var(--color-danger)]">{signOutError}</p>
        )}

        {/* Continue making */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Continue making
          </h2>

          {visibleChallenges.length > 0 ? (
            <div className="space-y-2.5">
              {visibleChallenges.map((challenge) => {
                const project = allProjects.find((p) => String(p.id) === String(challenge.projectId));
                if (!project) return null;
                return (
                  <Link key={challenge.challengeId} href="/challenges">
                    <div className="rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] px-4 py-3.5 transition-colors hover:border-[var(--color-brand-primary)]">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{project.title}</p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{project.craftType}</p>
                    </div>
                  </Link>
                );
              })}
              {activeChallenges.length > 2 && (
                <Link
                  href="/challenges"
                  className="block pt-0.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                >
                  +{activeChallenges.length - 2} more challenge{activeChallenges.length - 2 === 1 ? '' : 's'} →
                </Link>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] px-4 py-8 text-center">
              <p className="text-sm text-[var(--color-text-secondary)]">No active challenges yet.</p>
              <Link
                href="/discover"
                className="mt-4 inline-block rounded-lg bg-[var(--color-brand-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-primary-hover)]"
              >
                Discover projects
              </Link>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
