'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { projects as staticProjects } from '@/app/data/projects';
import { getUserProjects } from '@/lib/userProjects';
import { validateImageFile, fileToDataUrl } from '@/lib/imageUtils';
import { saveFinishedMake, type FinishedMakeImage } from '@/lib/finishedMakes';
import { archiveChallengeAfterFinish } from '@/lib/challengeArchive';
import { getOrCreateUserId } from '@/lib/communityProfiles';
import { getProfileData } from '@/lib/profile';
import Button from '@/components/ui/Button';
import { useMicroFeedback } from '@/hooks/useMicroFeedback';
import InlineFeedback from '@/components/feedback/InlineFeedback';

const MAX_MAKE_IMAGES = 3;
const MAX_CAPTION_CHARS = 300;

// ── Form ──────────────────────────────────────────────────────────────────────

function NewMakeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId') ?? '';
  const challengeId = searchParams.get('challengeId') ?? undefined;

  const [projectTitle, setProjectTitle] = useState('');
  const [images, setImages] = useState<FinishedMakeImage[]>([]);
  const [imageError, setImageError] = useState('');
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const imageInputRef = useRef<HTMLInputElement>(null);
  const { currentFeedback, showFeedback, dismissFeedback, captureAchievementSnapshot } = useMicroFeedback();

  // Resolve project title
  useEffect(() => {
    if (!projectId) return;
    const userProj = getUserProjects().find((p) => p.id === projectId);
    if (userProj) { setProjectTitle(userProj.title); return; }
    const staticProj = staticProjects.find((p) => String(p.id) === projectId);
    if (staticProj) setProjectTitle(staticProj.title);
  }, [projectId]);

  // ── Image handlers ──────────────────────────────────────────────────────────

  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (images.length >= MAX_MAKE_IMAGES) {
      setImageError(`You can add up to ${MAX_MAKE_IMAGES} photos.`);
      return;
    }

    const err = validateImageFile(file);
    if (err) { setImageError(err); return; }

    setImageError('');
    try {
      const dataUrl = await fileToDataUrl(file);
      const id = `mi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const isCover = images.length === 0;
      setImages((prev) => [...prev, { id, dataUrl, isCover }]);
    } catch {
      setImageError('Could not read that image. Try another.');
    }
  };

  const handleRemoveImage = (imgId: string) => {
    setImages((prev) => {
      const wasCover = prev.find((img) => img.id === imgId)?.isCover ?? false;
      const filtered = prev.filter((img) => img.id !== imgId);
      if (wasCover && filtered.length > 0) {
        filtered[0] = { ...filtered[0], isCover: true };
      }
      return filtered;
    });
    setImageError('');
  };

  const handleSetCover = (imgId: string) => {
    setImages((prev) => prev.map((img) => ({ ...img, isCover: img.id === imgId })));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (images.length === 0) {
      setSubmitError('Add at least one photo of your finished project.');
      return;
    }
    setSubmitError('');
    setIsSubmitting(true);

    try {
      captureAchievementSnapshot();
      const profile = getProfileData();
      saveFinishedMake({
        projectId,
        challengeId,
        authorId: getOrCreateUserId(),
        displayName: profile.name || 'Maker',
        caption: caption.trim() || undefined,
        images,
      });

      // Auto-archive the related challenge (idempotent, silent on failure)
      archiveChallengeAfterFinish({ challengeId, projectId });

      // Show celebration in context, then redirect
      showFeedback('finished_make_submitted');
      setTimeout(() => router.push('/challenges'), 2500);
    } catch {
      setSubmitError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24 space-y-6">

        {currentFeedback && (
          <InlineFeedback feedback={currentFeedback} onDismiss={dismissFeedback} />
        )}

        {/* Back link */}
        <Link
          href="/challenges"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)]"
        >
          ← Back to Challenges
        </Link>

        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            I finished this
          </h1>
          {projectTitle && (
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
              {projectTitle}
            </p>
          )}
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Share a photo of your completed make. Caption is optional.
          </p>
        </div>

        {/* Image section */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
            Photos · up to {MAX_MAKE_IMAGES}
          </p>

          {/* Thumbnail grid */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-3">
              {images.map((img) => (
                <div key={img.id} className="relative">
                  <button
                    type="button"
                    onClick={() => handleSetCover(img.id)}
                    className={`block h-20 w-20 overflow-hidden rounded-xl border-2 transition-colors ${
                      img.isCover
                        ? 'border-[var(--color-brand-primary)]'
                        : 'border-[var(--color-border-subtle)] hover:border-[var(--color-brand-primary)]/40'
                    }`}
                    title={img.isCover ? 'Cover photo' : 'Tap to set as cover'}
                  >
                    <img
                      src={img.dataUrl}
                      alt="Make photo"
                      className="h-full w-full object-cover"
                    />
                  </button>
                  {/* Cover badge */}
                  {img.isCover && (
                    <span className="absolute bottom-1 left-1 rounded-sm bg-[var(--color-brand-primary)] px-1 text-[9px] font-semibold text-white leading-tight">
                      Cover
                    </span>
                  )}
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(img.id)}
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-danger)] text-xs text-white leading-none"
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add photo button */}
          {images.length < MAX_MAKE_IMAGES && (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:border-[var(--color-brand-primary)]/40 hover:text-[var(--color-brand-primary)] transition-colors"
            >
              <span className="text-xl leading-none">+</span>
              <span className="text-[10px]">Add photo</span>
            </button>
          )}

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAddImage}
          />

          {imageError && (
            <p className="mt-2 text-xs text-[var(--color-danger)]">{imageError}</p>
          )}
        </div>

        {/* Caption section */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
            Caption
            <span className="ml-1.5 normal-case font-normal text-[var(--color-text-muted)]">— optional</span>
          </label>
          <textarea
            value={caption}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CAPTION_CHARS) setCaption(e.target.value);
            }}
            placeholder="A few words about your make…"
            rows={3}
            className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-white p-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
          />
          <p className="mt-1 text-right text-xs text-[var(--color-text-muted)]">
            {caption.length}/{MAX_CAPTION_CHARS}
          </p>
        </div>

        {/* Submit */}
        {submitError && (
          <p className="text-sm text-[var(--color-danger)]">{submitError}</p>
        )}
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? 'Saving…' : 'Share my finished make'}
        </Button>

      </div>
    </div>
  );
}

// ── Page wrapper with Suspense for useSearchParams ────────────────────────────

export default function NewMakePage() {
  return (
    <Suspense>
      <NewMakeForm />
    </Suspense>
  );
}
