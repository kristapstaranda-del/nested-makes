'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { projects } from '@/app/data/projects';
import { getUserProjects, normalizeUserProject, type DiscoverProject } from '@/lib/userProjects';

interface ChallengePlan {
  projectId: string;
  plan: {
    type: 'time_daily' | 'rows_daily' | 'days_per_week';
    target: number;
  };
}

type TrackingType = 'time_daily' | 'rows_daily' | 'days_per_week';

function ChallengeSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const challengeId = searchParams.get('challengeId');

  const [project, setProject] = useState<DiscoverProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [trackingType, setTrackingType] = useState<TrackingType | null>(null);
  const [target, setTarget] = useState('');

  // helper to generate a unique ID for new challenges
  const generateId = (): string => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return Date.now().toString();
  };

  useEffect(() => {
    if (projectId) {
      // Check static curated projects first, then fall back to user-created projects
      const staticFound = projects.find((p) => String(p.id) === String(projectId));
      if (staticFound) {
        setProject(staticFound as DiscoverProject);
      } else {
        const userFound = getUserProjects().find((p) => p.id === projectId);
        if (userFound) {
          setProject(normalizeUserProject(userFound));
        }
      }
    }

    // if editing an existing challenge, prefill plan values
    if (challengeId) {
      const existing = localStorage.getItem('activeChallenges');
      if (existing) {
        try {
          const arr = JSON.parse(existing);
          if (Array.isArray(arr)) {
            const match = arr.find((c) => c.challengeId === challengeId);
            if (match && match.plan) {
              setTrackingType(match.plan.type);
              setTarget(String(match.plan.target));
              setStep(2);
            }
          }
        } catch (e) {
          // ignore parse errors
        }
      }
    }

    setIsLoading(false);
  }, [projectId, challengeId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
          <h1 className="text-3xl font-bold text-neutral-900">Setup Challenge</h1>
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

  const handleConfirm = () => {
    if (!trackingType || !target) return;

    const targetNum = parseInt(target, 10);
    const config = getInputConfig(trackingType);
    if (!config || targetNum < config.min || targetNum > config.max) return;

    const today = new Date().toISOString().split('T')[0];

    const existing = localStorage.getItem('activeChallenges');
    let arr: any[] = [];
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed)) {
          arr = parsed;
        }
      } catch (e) {
        arr = [];
      }
    }

    if (challengeId) {
      // edit mode: update existing plan
      const idx = arr.findIndex((c) => c.challengeId === challengeId);
      if (idx !== -1) {
        arr[idx] = {
          ...arr[idx],
          plan: {
            type: trackingType,
            target: targetNum,
          },
        };
      } else {
        // if not found for some reason, fall back to appending new
        arr.push({
          challengeId: generateId(),
          projectId: project!.id,
          plan: {
            type: trackingType,
            target: targetNum,
          },
          createdAt: today,
        });
      }
      try {
        localStorage.setItem('__showChallengeUpdatedFeedback', 'true');
      } catch (e) {
        // ignore storage errors
      }
    } else {
      // create mode: append new challenge
      arr.push({
        challengeId: generateId(),
        projectId: project!.id,
        plan: {
          type: trackingType,
          target: targetNum,
        },
        createdAt: today,
      });
      // Flag for challenges page to show feedback
      try {
        localStorage.setItem('__showChallengeJoinedFeedback', 'true');
      } catch (e) {
        // ignore storage errors
      }
    }

    try {
      localStorage.setItem('activeChallenges', JSON.stringify(arr));
    } catch (e) {
      // ignore storage errors
    }

    router.push('/challenges');
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

          <div className="mt-6 flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setStep(1)}
            >
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={!isTargetValid}
            >
              Confirm Plan
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
