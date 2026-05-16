'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { projects as staticProjects } from '@/app/data/projects';
import { getUserProjects } from '@/lib/userProjects';
import {
  getFinishedMakesForProject,
  getFinishedMakeCoverImage,
  type FinishedMake,
} from '@/lib/finishedMakes';
import ImageLightbox from '@/components/ui/ImageLightbox';
import MakeLikeButton from '@/components/community/MakeLikeButton';
import MakeCommentThread from '@/components/community/MakeCommentThread';
import AuthorLink from '@/components/community/AuthorLink';

export default function ProjectMakesPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const [projectTitle, setProjectTitle] = useState('');
  const [makes, setMakes] = useState<FinishedMake[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    // Resolve project title (sync from local data sources)
    const staticProj = staticProjects.find((p) => String(p.id) === id);
    if (staticProj) {
      setProjectTitle(staticProj.title);
    } else {
      const userProj = getUserProjects().find((p) => p.id === id);
      if (userProj) setProjectTitle(userProj.title);
    }

    let cancelled = false;
    getFinishedMakesForProject(id)
      .then((rows) => {
        if (!cancelled) setMakes(rows);
      })
      .catch(() => {
        if (!cancelled) setMakes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">

        {/* Back link */}
        <Link
          href={`/projects/${id}`}
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)]"
        >
          ← Back to project
        </Link>

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Finished makes
          </h1>
          {projectTitle && (
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{projectTitle}</p>
          )}
        </div>

        {/* Empty state */}
        {makes.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)] italic">
            No finished makes yet. Be the first to share yours.
          </p>
        )}

        {/* Makes list */}
        <div className="space-y-4">
          {makes.map((make) => {
            const coverImage = getFinishedMakeCoverImage(make);
            const extraImages = make.images.filter((img) => !img.isCover).slice(0, 2);
            return (
              <div
                key={make.id}
                className="rounded-xl overflow-hidden bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]"
              >
                {/* Cover image */}
                {coverImage && (
                  <button
                    type="button"
                    onClick={() => setLightboxSrc(coverImage)}
                    className="block w-full"
                    aria-label="View finished make photo"
                  >
                    <img
                      src={coverImage}
                      alt="Finished make"
                      className="w-full aspect-[4/3] object-cover"
                      loading="lazy"
                    />
                  </button>
                )}

                {/* Extra thumbnails */}
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

                {/* Caption + attribution */}
                <div className="px-3.5 py-3">
                  {make.caption && (
                    <p className="text-sm text-[var(--color-text-primary)] leading-relaxed mb-2">
                      {make.caption}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <AuthorLink authorId={make.authorId} displayName={make.displayName} className="text-xs font-medium text-[var(--color-text-secondary)]" />
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {new Date(make.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  {/* Like */}
                  <div className="mt-2 pt-2 border-t border-[var(--color-border-subtle)]">
                    <MakeLikeButton makeId={make.id} />
                  </div>
                  {/* Comments */}
                  <MakeCommentThread makeId={make.id} />
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
