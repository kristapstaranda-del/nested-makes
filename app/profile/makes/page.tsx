'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFinishedMakesByAuthor, getFinishedMakeCoverImage, type FinishedMake } from '@/lib/finishedMakes';
import { supabase } from '@/lib/supabase/client';
import { projects as staticProjects } from '@/app/data/projects';
import { getUserProjects } from '@/lib/userProjects';
import ImageLightbox from '@/components/ui/ImageLightbox';

function getProjectTitle(projectId: string): string | null {
  const staticProj = staticProjects.find((p) => String(p.id) === projectId);
  if (staticProj) return staticProj.title;
  const userProj = getUserProjects().find((p) => p.id === projectId);
  return userProj?.title ?? null;
}

export default function MyMakesPage() {
  const [makes, setMakes] = useState<FinishedMake[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          if (!cancelled) {
            setMakes([]);
            setLoaded(true);
          }
          return;
        }
        const rows = await getFinishedMakesByAuthor(data.user.id);
        if (!cancelled) {
          setMakes(rows);
          setLoaded(true);
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[MyMakesPage] load failed', e);
        }
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">

        <Link
          href="/profile"
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)]"
        >
          ← Back to profile
        </Link>

        <div className="mb-5">
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            My Finished Makes
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            Everything you&apos;ve brought to life, in one place.
          </p>
          {makes.length > 0 && (
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              {makes.length} {makes.length === 1 ? 'make' : 'makes'}
            </p>
          )}
        </div>

        {loaded && makes.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)] italic">
            You haven&apos;t added a finished make yet.
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
                      <Link
                        href={`/projects/${make.projectId}/makes`}
                        className="text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-brand-primary)] transition-colors"
                      >
                        {projectTitle}
                      </Link>
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
