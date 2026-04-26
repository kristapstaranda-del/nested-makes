'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { projects } from '../../data/projects';
import { getUserProjects, deleteUserProject, getProjectCoverImage, type UserProject } from '@/lib/userProjects';
import { getFinishedMakesForProject, getFinishedMakeCoverImage, type FinishedMake } from '@/lib/finishedMakes';
import { getCommentsForMake } from '@/lib/finishedMakeComments';
import { getOrCreateUserId } from '@/lib/communityProfiles';
import StartChallengeButton from '@/components/StartChallengeButton';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import SectionHeader from '@/components/ui/SectionHeader';
import ProjectCategoryIcon from '@/components/ui/ProjectCategoryIcon';
import ImageLightbox from '@/components/ui/ImageLightbox';
import MakeLikeButton from '@/components/community/MakeLikeButton';
import AuthorLink from '@/components/community/AuthorLink';

const difficultyVariant = (difficulty: string) => {
  switch (difficulty.toLowerCase()) {
    case 'beginner':    return 'success';
    case 'intermediate': return 'primary';
    case 'advanced':    return 'warning';
    default:            return 'neutral';
  }
};

function formatPlan(
  plan: { type: 'time_daily' | 'rows_daily' | 'days_per_week'; target: number } | null
): string {
  if (!plan) return '';
  switch (plan.type) {
    case 'time_daily':    return `${plan.target} min/day`;
    case 'rows_daily':    return `${plan.target} rows/day`;
    case 'days_per_week': return `${plan.target} days/week`;
  }
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';

  const staticProject = projects.find((p) => String(p.id) === id);

  // ── Active challenge detection (lazy, synchronous, no flicker) ─────────────
  const [activeChallenge, setActiveChallenge] = useState<{
    challengeId: string;
    plan: { type: 'time_daily' | 'rows_daily' | 'days_per_week'; target: number } | null;
  } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('activeChallenges');
      if (!raw) return null;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return null;
      const found = arr.find((c) => String(c.projectId) === String(id));
      if (!found) return null;
      return { challengeId: found.challengeId, plan: found.plan ?? null };
    } catch {
      return null;
    }
  });

  // Derived boolean — keeps existing chip/backLink JSX untouched
  const isActive = activeChallenge !== null;

  // ── Workspace state ────────────────────────────────────────────────────────
  const [checkInMessage, setCheckInMessage] = useState('');
  const [checkInDoneToday, setCheckInDoneToday] = useState(false);
  const [checkInJustSaved, setCheckInJustSaved] = useState(false);
  const [displayName, setDisplayName] = useState('Anonymous');

  // ── User project state ─────────────────────────────────────────────────────
  const [userProject, setUserProject] = useState<UserProject | null>(null);
  const [loading, setLoading] = useState(!staticProject);

  // ── Lightbox state ─────────────────────────────────────────────────────────
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // ── Finished makes ─────────────────────────────────────────────────────────
  const [finishedMakes, setFinishedMakes] = useState<FinishedMake[]>([]);
  const [makesLightboxSrc, setMakesLightboxSrc] = useState<string | null>(null);
  const [makeCommentCounts, setMakeCommentCounts] = useState<Record<string, number>>({});

  // Load user project from localStorage if not a static project
  useEffect(() => {
    if (!staticProject) {
      const found = getUserProjects().find((p) => p.id === id) ?? null;
      setUserProject(found);
      setLoading(false);
    }
  }, [id, staticProject]);

  // Load finished makes + comment counts for this project
  useEffect(() => {
    const makes = getFinishedMakesForProject(id);
    setFinishedMakes(makes);
    const counts: Record<string, number> = {};
    makes.forEach((m) => {
      counts[m.id] = getCommentsForMake(m.id).length;
    });
    setMakeCommentCounts(counts);
  }, [id]);

  // Load displayName + today's check-in status when challenge is active
  useEffect(() => {
    if (!activeChallenge) return;
    const savedName = localStorage.getItem('displayName');
    if (savedName) setDisplayName(savedName);
    try {
      const today = new Date().toISOString().split('T')[0];
      const raw = localStorage.getItem('publicCheckIns');
      if (raw) {
        const all = JSON.parse(raw);
        if (Array.isArray(all)) {
          setCheckInDoneToday(
            all.some((ci) => ci.challengeId === activeChallenge.challengeId && ci.date === today)
          );
        }
      }
    } catch {}
  }, [activeChallenge?.challengeId]);

  // ── Derived image list (for lightbox; empty until userProject loads) ───────
  const coverImage = userProject ? getProjectCoverImage(userProject) : undefined;
  const secondaryImages = userProject
    ? (userProject.images ?? []).filter((img) => !img.isCover)
    : [];
  const allLightboxImages: string[] = [
    ...(coverImage ? [coverImage] : []),
    ...secondaryImages.map((img) => img.dataUrl),
  ];

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i));
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((i) =>
          i !== null && i < allLightboxImages.length - 1 ? i + 1 : i
        );
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIndex, allLightboxImages.length]);

  // ── Workspace handlers ─────────────────────────────────────────────────────
  function handleCheckIn() {
    if (!activeChallenge) return;
    const msg = checkInMessage.trim();
    if (!msg) return;
    const today = new Date().toISOString().split('T')[0];
    const newId =
      typeof window !== 'undefined' && window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : Date.now().toString();
    const newCheckIn = {
      id: newId,
      challengeId: activeChallenge.challengeId,
      projectId: id,
      date: today,
      message: msg,
      displayName,
      authorId: getOrCreateUserId(),
    };
    try {
      const raw = localStorage.getItem('publicCheckIns');
      let all: object[] = [];
      if (raw) { try { all = JSON.parse(raw); } catch { all = []; } }
      all.push(newCheckIn);
      localStorage.setItem('publicCheckIns', JSON.stringify(all));
    } catch {}
    setCheckInMessage('');
    setCheckInDoneToday(true);
    setCheckInJustSaved(true);
  }

  function handleArchive() {
    if (!activeChallenge) return;
    if (!window.confirm('Are you sure you want to archive this challenge?')) return;
    const { challengeId } = activeChallenge;
    try {
      const activeRaw = localStorage.getItem('activeChallenges');
      let activeArr: any[] = [];
      if (activeRaw) { try { activeArr = JSON.parse(activeRaw); } catch {} }
      const idx = activeArr.findIndex((c) => c.challengeId === challengeId);
      let removed: any = null;
      if (idx !== -1) {
        removed = activeArr.splice(idx, 1)[0];
        localStorage.setItem('activeChallenges', JSON.stringify(activeArr));
      }
      if (removed) {
        const archRaw = localStorage.getItem('archivedChallenges');
        let archived: any[] = [];
        if (archRaw) { try { archived = JSON.parse(archRaw); } catch {} }
        archived.push(removed);
        localStorage.setItem('archivedChallenges', JSON.stringify(archived));
      }
    } catch {}
    router.push('/challenges');
  }

  function renderActiveWorkspace(patternLink?: string) {
    const planText = activeChallenge?.plan ? formatPlan(activeChallenge.plan) : null;
    const alreadyDone = checkInDoneToday || checkInJustSaved;
    return (
      <div className="rounded-2xl bg-[var(--color-success-soft)] px-5 py-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-success)]">
            Currently in progress
          </p>
          {planText && (
            <p className="text-xs text-[var(--color-text-muted)]">Plan: {planText}</p>
          )}
        </div>

        {/* Pattern link */}
        {patternLink && (
          <a href={patternLink} target="_blank" rel="noopener noreferrer" className="mt-3 block">
            <Button variant="secondary" className="w-full">Open pattern ↗</Button>
          </a>
        )}

        {/* Divider */}
        <div className="my-4 border-t border-[var(--color-border-subtle)]" />

        {/* Check-in section */}
        <p className="text-xs font-semibold text-[var(--color-text-secondary)]">Today's check-in</p>
        {alreadyDone ? (
          <div className="mt-3 space-y-1">
            <p className="text-sm font-semibold text-[var(--color-success)]">✓ Checked in today — great work.</p>
            <p className="text-xs text-[var(--color-text-muted)]">Come back tomorrow to keep going.</p>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <textarea
              value={checkInMessage}
              onChange={(e) => { if (e.target.value.length <= 200) setCheckInMessage(e.target.value); }}
              rows={3}
              placeholder="How did it go today? Share a quick update…"
              className="w-full rounded-lg border border-neutral-300 bg-white p-3 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
            />
            <p className="text-right text-xs text-[var(--color-text-muted)]">{checkInMessage.length}/200</p>
            <Button
              variant="primary"
              className="w-full"
              disabled={!checkInMessage.trim()}
              onClick={handleCheckIn}
            >
              Complete today
            </Button>
          </div>
        )}

        {/* Divider */}
        <div className="my-4 border-t border-[var(--color-border-subtle)]" />

        {/* Navigation + archive */}
        <div className="grid grid-cols-2 gap-2">
          <Link href="/challenges">
            <Button variant="secondary" size="sm" className="w-full">Go to Challenges</Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
            onClick={handleArchive}
          >
            Archive challenge
          </Button>
        </div>
      </div>
    );
  }

  // ── Finished makes section ─────────────────────────────────────────────────
  function renderFinishedMakesSection() {
    if (finishedMakes.length === 0) return null;
    const featured = finishedMakes[0];
    const coverImage = getFinishedMakeCoverImage(featured);
    const hasMore = finishedMakes.length > 1;
    return (
      <div className="mt-6">
        {/* Header row: count + see-all link */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            {finishedMakes.length === 1 ? '1 maker finished this' : `${finishedMakes.length} makers finished this`}
          </p>
          {hasMore && (
            <Link
              href={`/projects/${id}/makes`}
              className="text-xs text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)]"
            >
              See finished makes
            </Link>
          )}
        </div>

        {/* Single featured make */}
        <div className="rounded-xl overflow-hidden bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
          {coverImage && (
            <button
              type="button"
              onClick={() => setMakesLightboxSrc(coverImage)}
              className="block w-full"
            >
              <img
                src={coverImage}
                alt="Finished make"
                className="w-full aspect-[4/3] object-cover"
                loading="lazy"
              />
            </button>
          )}
          <div className="px-3.5 py-3">
            {featured.caption && (
              <p className="text-sm text-[var(--color-text-primary)] leading-snug line-clamp-2 mb-2.5">
                {featured.caption}
              </p>
            )}
            {/* Footer: like on left, maker + date on right */}
            <div className="flex items-center justify-between gap-2">
              <MakeLikeButton makeId={featured.id} />
              <div className="flex items-center gap-1.5 min-w-0">
                <AuthorLink authorId={featured.authorId} displayName={featured.displayName} className="text-xs font-medium text-[var(--color-text-secondary)] truncate" />
                <span className="text-[10px] text-[var(--color-text-muted)] flex-none">·</span>
                <p className="text-[10px] text-[var(--color-text-muted)] flex-none">
                  {new Date(featured.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
            {/* Comment signal — links to full makes page */}
            <Link
              href={`/projects/${id}/makes`}
              className="mt-1.5 block text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              {(makeCommentCounts[featured.id] ?? 0) === 0
                ? 'Comment'
                : (makeCommentCounts[featured.id] === 1
                    ? '1 comment'
                    : `${makeCommentCounts[featured.id]} comments`) + ' →'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  const backLink = (
    <Link
      href={isActive ? '/challenges' : '/discover'}
      className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)]"
    >
      {isActive ? '← Back to Challenges' : '← Browse projects'}
    </Link>
  );

  // ── Static curated project ─────────────────────────────────────────────────
  if (staticProject) {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
          {backLink}
          <Card className="p-5">
            <div className="flex items-start gap-4">
              <ProjectCategoryIcon category={staticProject.craftType} size="lg" />
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{staticProject.title}</h1>
                <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">{staticProject.craftType}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Chip label={staticProject.difficulty} variant={difficultyVariant(staticProject.difficulty)} />
                  <Chip label="Project" variant="neutral" />
                  {isActive && <Chip label="In progress" variant="success" />}
                </div>
              </div>
            </div>
            <div className="mt-5">
              <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">What you'll make</h2>
              <p className="mt-2 text-[var(--color-text-primary)] leading-relaxed">{staticProject.description}</p>
            </div>
          </Card>
          <div className="mt-6">
            {isActive ? renderActiveWorkspace() : <StartChallengeButton projectId={staticProject.id} />}
          </div>
          {renderFinishedMakesSection()}
        </div>
        {makesLightboxSrc && (
          <ImageLightbox src={makesLightboxSrc} onClose={() => setMakesLightboxSrc(null)} />
        )}
      </div>
    );
  }

  // ── Loading (user project lookup pending) ──────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
          {backLink}
        </div>
      </div>
    );
  }

  // ── User-created project ───────────────────────────────────────────────────
  function handleDelete() {
    try {
      const raw = localStorage.getItem('activeChallenges');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.some((c) => c.projectId === id)) {
          alert(`"${userProject?.title}" is part of an active challenge and can't be deleted right now. End the challenge first, then come back to delete it.`);
          return;
        }
      }
    } catch {
      // If we can't read challenges, allow deletion to proceed safely
    }
    if (!window.confirm(`Delete "${userProject?.title}"? This can't be undone.`)) return;
    deleteUserProject(id);
    router.push('/discover');
  }

  if (userProject) {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
          {backLink}
          <Card className="overflow-hidden p-5">
            {coverImage && (
              <button
                type="button"
                className={`-mx-5 -mt-5 block w-[calc(100%+2.5rem)] aspect-[4/3] overflow-hidden bg-[var(--color-bg-soft)] cursor-pointer ${secondaryImages.length > 0 ? 'mb-3' : 'mb-5'}`}
                onClick={() => setLightboxIndex(0)}
                aria-label="View cover image"
              >
                <img
                  src={coverImage}
                  alt={userProject.title}
                  className="h-full w-full object-cover hover:opacity-90 transition-opacity"
                  loading="lazy"
                />
              </button>
            )}
            {secondaryImages.length > 0 && (
              <div className="mb-5 flex gap-2 overflow-x-auto pb-0.5">
                {secondaryImages.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    className="h-[72px] w-[72px] flex-none rounded-lg overflow-hidden bg-[var(--color-bg-soft)] cursor-pointer"
                    onClick={() => setLightboxIndex(i + 1)}
                    aria-label={`View photo ${i + 2}`}
                  >
                    <img
                      src={img.dataUrl}
                      alt={userProject.title}
                      className="h-full w-full object-cover hover:opacity-80 transition-opacity"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-start gap-4">
              {!coverImage && <ProjectCategoryIcon category={userProject.category} size="lg" />}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{userProject.title}</h1>
                <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">{userProject.category}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {userProject.difficulty && (
                    <Chip label={userProject.difficulty} variant={difficultyVariant(userProject.difficulty)} />
                  )}
                  <Chip label="Your project" variant="secondary" />
                  {isActive && <Chip label="In progress" variant="success" />}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">About this project</h2>
              <p className="mt-2 text-[var(--color-text-primary)] leading-relaxed">{userProject.description}</p>
            </div>

            {userProject.patternLink && (
              <div className="mt-5">
                <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Pattern</h2>
                <a
                  href={userProject.patternLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-sm text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)] break-all"
                >
                  {userProject.patternLink}
                </a>
              </div>
            )}

            {userProject.notes && (
              <div className="mt-5">
                <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Notes</h2>
                <p className="mt-2 text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">{userProject.notes}</p>
              </div>
            )}
          </Card>

          <div className="mt-6">
            {isActive
              ? renderActiveWorkspace(userProject.patternLink ?? undefined)
              : <StartChallengeButton projectId={userProject.id} />}
          </div>

          <div className="mt-4 flex gap-3">
            <Link href={`/projects/edit/${userProject.id}`} className="flex-1">
              <Button variant="secondary" className="w-full">Edit project</Button>
            </Link>
            <Button
              variant="ghost"
              className="flex-1 text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
          {renderFinishedMakesSection()}
        </div>

        {/* Makes lightbox */}
        {makesLightboxSrc && (
          <ImageLightbox src={makesLightboxSrc} onClose={() => setMakesLightboxSrc(null)} />
        )}

        {/* Project image lightbox */}
        {lightboxIndex !== null && allLightboxImages.length > 0 && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Close */}
            <button
              type="button"
              className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white text-xl hover:bg-black/70 transition-opacity"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
              aria-label="Close image"
            >
              ×
            </button>

            {/* Prev */}
            {lightboxIndex > 0 && (
              <button
                type="button"
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white text-2xl hover:bg-black/70 transition-opacity"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
                aria-label="Previous image"
              >
                ‹
              </button>
            )}

            {/* Next */}
            {lightboxIndex < allLightboxImages.length - 1 && (
              <button
                type="button"
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white text-2xl hover:bg-black/70 transition-opacity"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
                aria-label="Next image"
              >
                ›
              </button>
            )}

            {/* Image */}
            <img
              src={allLightboxImages[lightboxIndex]}
              alt={userProject.title}
              className="max-h-[90svh] max-w-[90vw] object-contain rounded-sm"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Dot indicator (only when multiple images) */}
            {allLightboxImages.length > 1 && (
              <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2">
                {allLightboxImages.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      i === lightboxIndex ? 'bg-white' : 'bg-white/35'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
        {backLink}
        <Card>
          <p className="text-lg text-[var(--color-text-secondary)] text-center">Project not found</p>
        </Card>
      </div>
    </div>
  );
}
