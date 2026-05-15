'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { projects } from '@/app/data/projects';
import { getUserProjects, normalizeUserProject, type DiscoverProject } from '@/lib/userProjects';
import {
  createChallenge,
  getChallenge,
  updateChallengePlan,
  type ChallengePlanType,
} from '@/lib/supabase/challenges';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import AuthRequiredPrompt from '@/components/auth/AuthRequiredPrompt';

type TrackingType = ChallengePlanType;

function ChallengeSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const challengeId = searchParams.get('challengeId');
  const { status: authStatus } = useAuthStatus();

  const [project, setProject] = useState<DiscoverProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [trackingType, setTrackingType] = useState<TrackingType | null>(null);
  const [target, setTarget] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Resolve project metadata (static curated first, then user-created).
  useEffect(() => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }
    const staticFound = projects.find((p) => String(p.id) === String(projectId));
    if (staticFound) {
      setProject(staticFound as DiscoverProject);
    } else {
      const userFound = getUserProjects().find((p) => p.id === projectId);
      if (userFound) {
        setProject(normalizeUserProject(userFound));
      }
    }
  }, [projectId]);

  // If editing an existing challenge, prefill plan from Supabase.
  // Wait until auth is resolved — RLS requires a session.
  useEffect(() => {
    if (authStatus === 'loading') return;

    if (!challengeId) {
      setIsLoading(false);
      return;
    }

    if (authStatus === 'anonymous') {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const existing = await getChallenge(challengeId);
        if (cancelled) return;
        if (existing && existing.plan) {
          setTrackingType(existing.plan.type);
          setTarget(String(existing.plan.target));
          setStep(2);
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ChallengeSetup] prefill failed', e);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [challengeId, authStatus]);

  if (isLoading || authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
          <h1 className="text-3xl font-bold text-neutral-900">Setup Challenge</h1>
        </div>
      </div>
    );
  }

  if (authStatus === 'anonymous') {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
          <h1 className="text-3xl font-bold text-neutral-900">Setup Challenge</h1>
          <div className="mt-6">
            <AuthRequiredPrompt
              title="Log in to start a challenge."
              description="Challenges are saved to your account so you can pick up from any device."
            />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
          <h1 className="text-3xl font-bold text-neutral-900">Setup Challenge</h1>
          <div className="mt-6 rounded-lg bg-white p-6 text-center">
            <p className="text-neutral-600">Project not found</p>
            <Link
              href="/discover"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700"
            >
              Back to Projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getInputConfig = (type: TrackingType | null) => {
    if (!type) return null;
    switch (type) {
      case 'time_daily':
        return { label: 'Minutes per day', min: 5, max: 180, placeholder: '30' };
      case 'rows_daily':
        return { label: 'Rows per day', min: 1, max: 500, placeholder: '10' };
      case 'days_per_week':
        return { label: 'Days per week', min: 1, max: 7, placeholder: '5' };
    }
  };

  const getTypeLabel = (type: TrackingType) => {
    switch (type) {
      case 'time_daily':
        return 'Time each day';
      case 'rows_daily':
        return 'Rows each day';
      case 'days_per_week':
        return 'Days per week';
    }
  };

  const handleConfirm = async () => {
    if (!trackingType || !target) return;
    const targetNum = parseInt(target, 10);
    const config = getInputConfig(trackingType);
    if (!config || targetNum < config.min || targetNum > config.max) return;
    if (!project) return;

    setIsSaving(true);
    setSaveError('');
    try {
      if (challengeId) {
        await updateChallengePlan(challengeId, { type: trackingType, target: targetNum });
        try {
          localStorage.setItem('__showChallengeUpdatedFeedback', 'true');
        } catch {}
      } else {
        await createChallenge({
          projectId: String(project.id),
          plan: { type: trackingType, target: targetNum },
        });
        try {
          localStorage.setItem('__showChallengeJoinedFeedback', 'true');
        } catch {}
      }
      router.push('/challenges');
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : 'Could not save challenge. Please try again.',
      );
      setIsSaving(false);
    }
  };

  const config = getInputConfig(trackingType);
  const targetNum = target ? parseInt(target, 10) : null;
  const isTargetValid =
    trackingType &&
    target &&
    targetNum !== null &&
    targetNum >= (config?.min || 0) &&
    targetNum <= (config?.max || Infinity);

  if (step === 1) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
          <h1 className="text-3xl font-bold text-neutral-900">Setup Challenge</h1>
          <p className="mt-2 text-neutral-600">{project.title}</p>

          <Card className="mt-6">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              How do you want to track progress?
            </h2>

            <div className="mt-4 space-y-3">
              {(['time_daily', 'rows_daily', 'days_per_week'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setTrackingType(type);
                    setStep(2);
                  }}
                  className={`w-full rounded-lg border-2 p-4 text-left font-semibold transition ${
                    trackingType === type
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400'
                  }`}
                >
                  {getTypeLabel(type)}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
        <h1 className="text-3xl font-bold text-neutral-900">Setup Challenge</h1>
        <p className="mt-2 text-neutral-600">{project.title}</p>

        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {config?.label}
          </h2>

          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            min={config?.min}
            max={config?.max}
            placeholder={config?.placeholder}
            className="mt-4 w-full rounded-lg border border-neutral-300 px-4 py-3 text-lg font-semibold text-neutral-900 placeholder-neutral-500"
          />

          <p className="mt-2 text-xs text-neutral-600">
            Min: {config?.min}, Max: {config?.max}
          </p>

          {saveError && (
            <p className="mt-2 text-sm text-[var(--color-danger)]">{saveError}</p>
          )}

          <div className="mt-6 flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setStep(1)}
              disabled={isSaving}
            >
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={!isTargetValid || isSaving}
            >
              {isSaving ? 'Saving…' : 'Confirm Plan'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function ChallengeSetupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChallengeSetupContent />
    </Suspense>
  );
}
