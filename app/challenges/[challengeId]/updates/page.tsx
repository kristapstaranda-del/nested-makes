'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getUserProjects } from '@/lib/userProjects';
import { getSupabasePublicUserProject } from '@/lib/supabase/userProjects';
import { sanitizeCoverImage } from '@/lib/imageUtils';
import ImageLightbox from '@/components/ui/ImageLightbox';
import ReactionButton from '@/components/community/ReactionButton';
import ReplyThread from '@/components/community/ReplyThread';
import AuthorLink from '@/components/community/AuthorLink';
import { getAvatarById } from '@/lib/avatarLibrary';
import {
  getCheckInsForChallenge,
  type CheckInWithAuthor,
} from '@/lib/supabase/checkIns';
import { getChallenge } from '@/lib/supabase/challenges';

type CheckIn = CheckInWithAuthor;

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function ChallengeUpdatesPage() {
  const params = useParams();
  const challengeId = typeof params.challengeId === 'string' ? params.challengeId : '';

  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!challengeId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // Fetch check-ins + the challenge row in parallel.
        const [rows, challenge] = await Promise.all([
          getCheckInsForChallenge(challengeId),
          getChallenge(challengeId),
        ]);
        if (cancelled) return;
        setCheckIns(rows);

        const projectId = challenge?.projectId;
        if (projectId) {
          const local = getUserProjects().find((p) => p.id === projectId);
          if (local) {
            setProjectTitle(local.title);
          } else {
            const remote = await getSupabasePublicUserProject(projectId);
            if (!cancelled && remote) setProjectTitle(remote.title);
          }
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ChallengeUpdatesPage] load failed', e);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [challengeId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">

        {/* Back link */}
        <Link
          href="/challenges"
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)]"
        >
          ← Back to Challenges
        </Link>

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            {projectTitle ? `${projectTitle} updates` : 'Challenge updates'}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
            {checkIns.length === 0
              ? 'No updates yet.'
              : checkIns.length === 1
              ? '1 community update'
              : `${checkIns.length} community updates`}
          </p>
        </div>

        {/* Updates list */}
        {checkIns.length > 0 ? (
          <div className="space-y-3">
            {checkIns.map((ci) => {
              const safeImage = sanitizeCoverImage(ci.imageUrl);
              const ciAvatar = getAvatarById(ci.authorAvatarId);
              const ciInitials = ci.displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') || '?';
              return (
                <div key={ci.id} className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] px-4 py-3.5 shadow-sm">
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
                      {formatDate(ci.date)}
                    </span>
                  </div>
                  {/* Content */}
                  {ci.message ? (
                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                      {ci.message}
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
                        className="w-full max-h-56 object-cover"
                        loading="lazy"
                      />
                    </button>
                  )}
                  {/* Reactions */}
                  <div className="mt-2.5 pt-2 border-t border-[var(--color-border-subtle)]">
                    <ReactionButton checkInId={ci.id} />
                  </div>
                  {/* Replies */}
                  <ReplyThread checkInId={ci.id} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] px-4 py-8 text-center shadow-sm">
            <p className="text-sm text-[var(--color-text-muted)] italic">
              No updates shared yet. Be the first to check in.
            </p>
          </div>
        )}

      </div>
      {lightboxImage && (
        <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}
    </div>
  );
}
