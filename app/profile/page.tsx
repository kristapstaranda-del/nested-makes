'use client';

import { useEffect, useState } from 'react';
import { useMicroFeedback } from '@/hooks/useMicroFeedback';
import InlineFeedback from '@/components/feedback/InlineFeedback';
import { getProfileData, saveProfileData, ProfileData } from '@/lib/profile';
import {
  getCurrentHabitStreak,
  getBestHabitStreak,
  getLast7DaysCompletionCount,
  getLast7DaysCompletionRate,
} from '@/lib/habitStats';
import { getUserProjects, type UserProject } from '@/lib/userProjects';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileAchievements from '@/components/profile/ProfileAchievements';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileActivity from '@/components/profile/ProfileActivity';
import ProfileProjects from '@/components/profile/ProfileProjects';
import EditProfileModal from '@/components/profile/EditProfileModal';
import NotificationFeed from '@/components/notifications/NotificationFeed';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { getSupabaseProfile, upsertSupabaseProfile, type SupabaseProfile } from '@/lib/supabase/profiles';
import { getOrCreateUserId } from '@/lib/communityProfiles';
import { getFinishedMakesByAuthor, getFinishedMakeCoverImage, type FinishedMake } from '@/lib/finishedMakes';
import { projects as staticProjects } from '@/app/data/projects';
import {
  getActiveChallenges,
  getArchivedChallenges,
  type ActiveChallenge,
} from '@/lib/supabase/challenges';
import {
  getActiveHabit,
  getAllHabitLogs,
  type ActiveHabit,
  type HabitLog,
} from '@/lib/supabase/habits';
import {
  getCheckInsForUser,
  type CheckInWithAuthor,
} from '@/lib/supabase/checkIns';

type CheckIn = CheckInWithAuthor;

function mergeSupabaseIntoLocal(local: ProfileData, remote: SupabaseProfile): ProfileData {
  return {
    ...local,
    nickname: remote.nickname || local.nickname,
    about: remote.about || local.about,
    craftInterests: remote.craft_interests?.length ? remote.craft_interests : local.craftInterests,
    avatarId: remote.avatar_id || local.avatarId,
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { currentFeedback, showFeedback, dismissFeedback } = useMicroFeedback();

  const [userId, setUserId] = useState<string | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [supabaseError, setSupabaseError] = useState('');
  const [saveError, setSaveError] = useState('');

  const [activeChallenges, setActiveChallenges] = useState<ActiveChallenge[]>([]);
  const [archivedChallenges, setArchivedChallenges] = useState<ActiveChallenge[]>([]);
  const [publicCheckIns, setPublicCheckIns] = useState<CheckIn[]>([]);
  const [activeHabit, setActiveHabit] = useState<ActiveHabit | null>(null);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [userProjects, setUserProjects] = useState<UserProject[]>([]);
  const [myMakes, setMyMakes] = useState<FinishedMake[]>([]);

  // Habit stats — async, loaded after Supabase resolves.
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [last7DaysCount, setLast7DaysCount] = useState(0);
  const [last7DaysRate, setLast7DaysRate] = useState(0);

  // Synchronous bootstrap: localStorage-backed pieces only.
  useEffect(() => {
    const profileData = getProfileData();
    setProfile(profileData);

    setUserProjects(getUserProjects());

    const userId = getOrCreateUserId();
    setMyMakes(getFinishedMakesByAuthor(userId));

    setIsLoading(false);
  }, []);

  // Supabase data: challenges, habit, habit logs, derived stats.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!data.user) return; // anonymous → leave empty

        const [active, archived, habit, logs, cs, bs, l7c, l7r, myCheckIns] = await Promise.all([
          getActiveChallenges(),
          getArchivedChallenges(),
          getActiveHabit(),
          getAllHabitLogs(),
          getCurrentHabitStreak(),
          getBestHabitStreak(),
          getLast7DaysCompletionCount(),
          getLast7DaysCompletionRate(),
          getCheckInsForUser(data.user.id),
        ]);
        if (cancelled) return;
        setActiveChallenges(active);
        setArchivedChallenges(archived);
        setActiveHabit(habit);
        setHabitLogs(logs);
        setCurrentStreak(cs);
        setBestStreak(bs);
        setLast7DaysCount(l7c);
        setLast7DaysRate(l7r);
        setPublicCheckIns(myCheckIns);

        // Mirror current user's check-ins to legacy localStorage so the
        // achievements module sees them. Phase 2.4 removes this.
        try {
          localStorage.setItem(
            'publicCheckIns',
            JSON.stringify(
              myCheckIns.map((ci) => ({
                id: ci.id,
                challengeId: ci.challengeId,
                date: ci.date,
                message: ci.message,
                displayName: ci.displayName,
                authorId: ci.authorId,
                authorAvatarId: ci.authorAvatarId,
                imageUrl: ci.imageUrl,
              })),
            ),
          );
        } catch {}

        // Mirror to legacy localStorage keys for the achievements module.
        // Phase 2.4 removes this once achievements are migrated.
        try {
          localStorage.setItem('activeChallenges', JSON.stringify(active));
          localStorage.setItem('archivedChallenges', JSON.stringify(archived));
          localStorage.setItem('habitLogs', JSON.stringify(logs));
          if (habit) {
            localStorage.setItem('activeHabit', JSON.stringify(habit));
          } else {
            localStorage.removeItem('activeHabit');
          }
        } catch {}
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ProfilePage] Supabase load failed', e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSupabaseLoading(true);
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return;
      if (!data.user) {
        setSupabaseLoading(false);
        return;
      }
      setUserId(data.user.id);
      try {
        const remote = await getSupabaseProfile(data.user.id);
        if (cancelled) return;
        if (remote) {
          setProfile((prev) => (prev ? mergeSupabaseIntoLocal(prev, remote) : prev));
        }
      } catch {
        if (!cancelled) setSupabaseError('Could not load your saved profile.');
      } finally {
        if (!cancelled) setSupabaseLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserId(null);
  };

  const handleSaveProfile = (data: ProfileData) => {
    saveProfileData(data);
    setProfile(data);
    showFeedback('profile_updated');

    if (userId) {
      setSaveError('');
      upsertSupabaseProfile(userId, {
        display_name: data.nickname || null,
        about: data.about || null,
        craft_interests: data.craftInterests.length ? data.craftInterests : null,
        avatar_id: data.avatarId || null,
      }).catch(() => setSaveError('Profile saved locally but could not sync to your account.'));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
          <h1 className="text-3xl font-bold text-neutral-900">Profile</h1>
          <div className="mt-6 animate-pulse">
            <div className="h-24 bg-white rounded-xl mb-4"></div>
            <div className="h-32 bg-white rounded-xl mb-4"></div>
            <div className="h-40 bg-white rounded-xl mb-4"></div>
            <div className="h-36 bg-white rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  // Compute stats (challenge/check-in counts are derived from state; habit
  // stats come from Supabase via the async effect below).
  const activeChallengesCount = activeChallenges.length;
  const archivedChallengesCount = archivedChallenges.length;
  const totalCheckInsCount = publicCheckIns.length;

  // Activity data
  const hasActiveHabit = !!activeHabit;
  const today = new Date().toISOString().split('T')[0];
  const todayHabitLog = habitLogs.find(
    (log) => log.habitId === activeHabit?.habitId && log.date === today
  );
  const todayHabitStatus = todayHabitLog ? todayHabitLog.status : null;

  // Pass all check-ins sorted; ProfileActivity handles the preview slice and expand/collapse
  const allCheckIns = publicCheckIns
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
        {currentFeedback && (
          <div className="mb-4">
            <InlineFeedback feedback={currentFeedback} onDismiss={dismissFeedback} />
          </div>
        )}

        {supabaseLoading && (
          <p className="mb-3 text-xs text-[var(--color-text-muted)]">Syncing profile…</p>
        )}
        {!supabaseLoading && userId === null && (
          <p className="mb-3 text-xs text-[var(--color-text-muted)]">
            <Link href="/" className="underline underline-offset-2 hover:text-[var(--color-text-secondary)] transition-colors">
              Create an account or log in
            </Link>{' '}
            to save your profile across devices.
          </p>
        )}
        {!supabaseLoading && userId !== null && (
          <div className="mb-3 flex justify-end">
            <button
              onClick={handleSignOut}
              className="text-xs text-[var(--color-text-muted)] underline underline-offset-2 hover:text-[var(--color-text-secondary)] transition-colors"
            >
              Log out
            </button>
          </div>
        )}
        {supabaseError && (
          <p className="mb-3 text-xs text-[var(--color-danger)]">{supabaseError}</p>
        )}
        {saveError && (
          <p className="mb-3 text-xs text-[var(--color-danger)]">{saveError}</p>
        )}

        {(!profile.nickname || profile.nickname === 'Maker') && profile.craftInterests.length === 0 && (
          <p className="mb-4 text-sm text-[var(--color-text-secondary)]">Welcome to Nested Makes! Set up your profile to get started.</p>
        )}

        <div className="space-y-5">
          <ProfileHeader
            nickname={profile.nickname}
            about={profile.about}
            avatarId={profile.avatarId}
            statusText={`${activeChallengesCount} active · ${archivedChallengesCount} completed · ${totalCheckInsCount} updates`}
            craftInterests={profile.craftInterests}
            onEdit={() => setIsEditModalOpen(true)}
          />

          <ProfileAchievements />

          <ProfileStats
            activeChallengesCount={activeChallengesCount}
            archivedChallengesCount={archivedChallengesCount}
            totalCheckInsCount={totalCheckInsCount}
            currentStreak={currentStreak}
            bestStreak={bestStreak}
            last7DaysCount={last7DaysCount}
            last7DaysRate={last7DaysRate}
          />

          <NotificationFeed />

          <ProfileActivity
            hasActiveHabit={hasActiveHabit}
            todayHabitStatus={todayHabitStatus}
            checkIns={allCheckIns}
          />

          <ProfileProjects userProjects={userProjects} />

          {/* My Finished Makes */}
          <div className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">My Finished Makes</h3>
            {myMakes.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] italic">
                You haven&apos;t added a finished make yet.
              </p>
            ) : (
              <div className="space-y-3">
                {myMakes.slice(0, 3).map((make) => {
                  const coverImage = getFinishedMakeCoverImage(make);
                  const resolvedProject =
                    staticProjects.find((p) => String(p.id) === make.projectId) ??
                    userProjects.find((p) => p.id === make.projectId) ??
                    null;
                  // Primary text: project name > caption > warm personal fallback
                  const titleText = resolvedProject?.title ?? make.caption ?? 'My make';
                  // Caption as subtitle only when the project name already holds the title slot
                  const subtitleText = resolvedProject && make.caption ? make.caption : null;
                  return (
                    <Link
                      key={make.id}
                      href={`/projects/${make.projectId}/makes`}
                      className="flex items-center gap-3 group"
                    >
                      {coverImage ? (
                        <div className="h-14 w-14 flex-none overflow-hidden rounded-lg bg-[var(--color-bg-soft)]">
                          <img
                            src={coverImage}
                            alt={titleText}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="h-14 w-14 flex-none rounded-lg bg-[var(--color-bg-soft)]" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-brand-primary)] transition-colors">
                          {titleText}
                        </p>
                        {subtitleText && (
                          <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">
                            {subtitleText}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            {myMakes.length > 3 && (
              <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
                <Link
                  href="/profile/makes"
                  className="text-xs text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)]"
                >
                  See all {myMakes.length} makes →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profileData={profile}
        onSave={handleSaveProfile}
      />
    </div>
  );
}
