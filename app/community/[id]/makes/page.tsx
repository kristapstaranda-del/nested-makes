'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getPublicProfile, type PublicProfile } from '@/lib/communityProfiles';
import { getFinishedMakesByAuthor, getFinishedMakeCoverImage, type FinishedMake } from '@/lib/finishedMakes';
import { getSupabaseProfile } from '@/lib/supabase/profiles';
import { projects as staticProjects } from '@/app/data/projects';
import Card from '@/components/ui/Card';
import ImageLightbox from '@/components/ui/ImageLightbox';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getProjectTitle(projectId: string): string | null {
  return staticProjects.find((p) => String(p.id) === projectId)?.title ?? null;
}

export default function CommunityMakesPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const [profile, setProfile] = useState<PublicProfile | null | 'loading'>('loading');
  const [makes, setMakes] = useState<FinishedMake[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      // Resolve profile: UUID → Supabase, otherwise mock fallback.
      if (UUID_RE.test(id)) {
        try {
          const remote = await getSupabaseProfile(id);
          if (cancelled) return;
          if (!remote) {
            setProfile(null);
          } else {
            setProfile({
              id: remote.id,
              displayName: remote.nickname || 'Maker',
              about: remote.about ?? '',
              craftInterests: remote.craft_interests ?? [],
              avatarId: remote.avatar_id ?? undefined,
              avatarColor: remote.avatar_color ?? undefined,
              publicBadges: [],
              recentCheckIns: [],
              finishedProjects: [],
            });
          }
        } catch {
          if (!cancelled) setProfile(null);
        }
      } else {
        setProfile(getPublicProfile(id));
      }

      try {
        const rows = await getFinishedMakesByAuthor(id);
        if (!cancelled) setMakes(rows);
      } catch {
        if (!cancelled) setMakes([]);
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
      href={`/community/${id}`}
      className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)]"
    >
      ← Back to {profile?.displayName ? `${profile.displayName}'s profile` : 'profile'}
    </Link>
  );

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

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">

        {backLink}

        <div className="mb-5">
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            {profile.displayName}&apos;s Finished Makes
          </h1>
          {makes.length > 0 && (
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
              {makes.length} {makes.length === 1 ? 'make' : 'makes'}
            </p>
          )}
        </div>

        {makes.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)] italic">
            No finished makes shared yet.
          </p>
        )}

        <div className="space-y-4">
          {makes.map((make) => {
            const coverImage = getFinishedMakeCoverImage(make);
            const extraImages = make.images.filter((img) => !img.isCover).slice(0, 2);
            const projectTitle = getProjectTitle(make.projectId);
            return (
              <div
                key={make.id}
                className="rounded-xl overflow-hidden bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] shadow-sm"
              >
                {coverImage && (
                  <button
                    type="button"
                    onClick={() => setLightboxSrc(coverImage)}
                    className="block w-full"
                    aria-label="View finished make photo"
                  >
                    <img
                      src={coverImage}
                      alt={projectTitle ?? make.caption ?? 'Finished make'}
                      className="w-full aspect-[4/3] object-cover"
                      loading="lazy"
                    />
                  </button>
                )}

                {extraImages.length > 0 && (
                  <div className="flex gap-2 px-3.5 pt-2.5">
                    {extraImages.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setLightboxSrc(img.dataUrl)}
                        className="h-16 w-16 flex-none overflow-hidden rounded-lg bg-[var(--color-bg-soft)]"
                        aria-label="View photo"
                      >
                        <img
                          src={img.dataUrl}
                          alt="Make photo"
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}

                <div className="px-3.5 py-3">
                  {make.caption && (
                    <p className="text-sm text-[var(--color-text-primary)] leading-relaxed mb-2">
                      {make.caption}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    {projectTitle && (
                      <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                        {projectTitle}
                      </p>
                    )}
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {new Date(make.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  );
}
