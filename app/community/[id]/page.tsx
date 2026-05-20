'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { type PublicProfile, type PublicCheckInEntry } from '@/lib/communityProfiles';
import { getAvatarById } from '@/lib/avatarLibrary';
import { getFinishedMakesByAuthor, getFinishedMakeCoverImage, type FinishedMake } from '@/lib/finishedMakes';
import Card from '@/components/ui/Card';
import ImageLightbox from '@/components/ui/ImageLightbox';
import { getSupabaseProfile } from '@/lib/supabase/profiles';
import { getCheckInsForUser } from '@/lib/supabase/checkIns';
import { getAllPublicUserProjects } from '@/lib/supabase/userProjects';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Derives a soft maker label from the profile's public badges and craft interests.
 * Returns the most relevant community badge title, or a gentle craft-based label.
 */
function getMakerLabel(profile: PublicProfile): string {
  const topBadge = profile.publicBadges[0];
  if (topBadge) return topBadge.title;
  if (profile.craftInterests.length > 0) return `${profile.craftInterests[0]} maker`;
  return 'Craft community member';
}

export default function CommunityProfilePage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const [profile, setProfile] = useState<PublicProfile | null | 'loading'>('loading');
  const [finishedMakes, setFinishedMakes] = useState<FinishedMake[]>([]);
  const [projectTitleMap, setProjectTitleMap] = useState<Map<string, string>>(new Map());
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    (async () => {
      // After Phase 2.4 only Supabase UUID profiles exist.
      if (!UUID_RE.test(id)) {
        if (!cancelled) {
          setProfile(null);
          setFinishedMakes([]);
        }
        return;
      }

      try {
        const [remote, checkIns, makes, allProjects] = await Promise.all([
          getSupabaseProfile(id),
          getCheckInsForUser(id, { limit: 5 }),
          getFinishedMakesByAuthor(id),
          getAllPublicUserProjects(),
        ]);
        if (cancelled) return;

        setFinishedMakes(makes);
        const map = new Map<string, string>();
        allProjects.forEach((p) => map.set(p.id, p.title));
        setProjectTitleMap(map);

        if (!remote) {
          setProfile(null);
          return;
        }
        const recentCheckIns: PublicCheckInEntry[] = checkIns.map((ci) => ({
          id: ci.id,
          message: ci.message,
          date: ci.date,
          displayName: ci.displayName,
          authorId: ci.authorId,
          imageUrl: ci.imageUrl,
        }));
        setProfile({
          id: remote.id,
          displayName: remote.nickname || 'Maker',
          about: remote.about ?? '',
          craftInterests: remote.craft_interests ?? [],
          avatarId: remote.avatar_id ?? undefined,
          avatarColor: remote.avatar_color ?? undefined,
          publicBadges: [],
          recentCheckIns,
          finishedProjects: [],
        });
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[CommunityProfilePage] Supabase load failed', e);
        }
        if (!cancelled) setProfile(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (profile === 'loading') {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24" />
      </div>
    );
  }

  const backLink = (
    <Link
      href="/challenges"
      className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)]"
    >
      ← Back to Challenges
    </Link>
  );

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!profile) {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
          {backLink}
          <Card>
            <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
              This profile is not available yet.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const initials =
    profile.displayName
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2) || 'A';

  const hasCheckIns = profile.recentCheckIns.length > 0;
  const hasAbout = !!profile.about;
  const hasInterests = profile.craftInterests.length > 0;
  const makerLabel = getMakerLabel(profile);
  const previewCheckIns = profile.recentCheckIns.slice(0, 2);
  const selectedAvatar = getAvatarById(profile.avatarId);

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24 space-y-5">
        {backLink}

        {/* Identity card */}
        <Card>
          <div className="flex items-start gap-4">
            {/* Avatar - circle */}
            <div
              className="flex h-16 w-16 flex-none items-center justify-center rounded-full text-lg font-semibold text-white"
              style={{ backgroundColor: profile.avatarColor ?? '#6E8F7A' }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              {/* Maker label — soft identity accent */}
              <p className="text-xs font-medium text-[var(--color-brand-primary)] mb-0.5">
                {makerLabel}
              </p>
              <h1 className="text-xl font-semibold text-[var(--color-text-primary)] truncate">
                {profile.displayName}
              </h1>
              {hasAbout ? (
                <p className="text-sm text-[var(--color-text-secondary)] leading-snug mt-0.5">
                  {profile.about}
                </p>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)] italic mt-0.5">
                  No bio yet.
                </p>
              )}
            </div>
          </div>

          {hasInterests && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.craftInterests.map((interest, i) => (
                <span
                  key={i}
                  className="rounded-full bg-[var(--color-brand-primary-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-brand-primary)]"
                >
                  {interest}
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* Recent updates */}
        <div className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] shadow-sm">
          <div className="px-5 pt-4 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Recent updates
            </p>
          </div>

          {hasCheckIns ? (
            <div className="px-5 pb-4 divide-y divide-[var(--color-border-subtle)]">
              {previewCheckIns.map((ci) => (
                <div key={ci.id} className="py-3 first:pt-0">
                  <p className="text-[10px] text-[var(--color-text-muted)] mb-1.5">
                    {formatDate(ci.date)}
                  </p>
                  {ci.message ? (
                    <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                      {ci.message}
                    </p>
                  ) : !ci.imageUrl && (
                    <p className="text-sm text-[var(--color-text-muted)] italic leading-relaxed">
                      Made a little progress today.
                    </p>
                  )}
                  {ci.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setLightboxImage(ci.imageUrl!)}
                      className={`block w-full overflow-hidden rounded-lg ${ci.message ? 'mt-2.5' : 'mt-1'}`}
                    >
                      <img
                        src={ci.imageUrl}
                        alt="Check-in photo"
                        className="w-full max-h-48 object-cover"
                        loading="lazy"
                      />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 pb-4 border-t border-[var(--color-border-subtle)]">
              <p className="pt-3 text-sm text-[var(--color-text-muted)] italic">
                No updates shared yet.
              </p>
            </div>
          )}
        </div>

        {/* Finished makes */}
        <div className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Finished makes
            </p>
            {finishedMakes.length > 3 && (
              <Link
                href={`/community/${profile.id}/makes`}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                See all →
              </Link>
            )}
          </div>
          {finishedMakes.length === 0 ? (
            <div className="px-5 pb-4 border-t border-[var(--color-border-subtle)]">
              <p className="pt-3 text-sm text-[var(--color-text-muted)] italic">
                No finished makes shared yet.
              </p>
            </div>
          ) : (
            <div>
              {finishedMakes.slice(0, 3).map((make, idx) => {
                const coverImage = getFinishedMakeCoverImage(make);
                const projectTitle = projectTitleMap.get(make.projectId) ?? null;
                // Primary text: project name > caption > personal fallback
                const titleText = projectTitle ?? make.caption ?? `${profile.displayName}'s make`;
                // Caption as subtitle only when the project name already occupies the title slot
                const subtitleText = projectTitle && make.caption ? make.caption : null;
                return (
                  <div
                    key={make.id}
                    className={`flex items-center gap-3 px-5 py-3 ${idx > 0 ? 'border-t border-[var(--color-border-subtle)]' : ''}`}
                  >
                    {coverImage ? (
                      <div className="h-12 w-12 flex-none overflow-hidden rounded-lg bg-[var(--color-bg-soft)]">
                        <img
                          src={coverImage}
                          alt={titleText}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-12 flex-none rounded-lg bg-[var(--color-bg-soft)]" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                        {titleText}
                      </p>
                      {subtitleText && (
                        <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                          {subtitleText}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    {lightboxImage && (
      <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
    )}
    </div>
  );
}
