'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  archiveHabit,
  getActiveHabit,
  upsertActiveHabit,
  type HabitPlanType,
} from '@/lib/supabase/habits';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import AuthRequiredPrompt from '@/components/auth/AuthRequiredPrompt';

type TrackingType = HabitPlanType;

export default function HabitSetupPage() {
  const router = useRouter();
  const { status: authStatus } = useAuthStatus();

  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [trackingType, setTrackingType] = useState<TrackingType | null>(null);
  const [target, setTarget] = useState('');
  const [existingHabitId, setExistingHabitId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Prefill from the active Supabase habit (if one exists).
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'anonymous') {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const existing = await getActiveHabit();
        if (cancelled) return;
        if (existing) {
          setTrackingType(existing.plan.type);
          setTarget(String(existing.plan.target));
          setExistingHabitId(existing.habitId);
          setStep(2);
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[HabitSetup] prefill failed', e);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authStatus]);

  const getInputConfig = (type: TrackingType | null) => {
    if (!type) return null;
    switch (type) {
      case 'time_daily':
        return { label: 'Minutes per day', min: 1, max: 180, placeholder: '30' };
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

    setIsSaving(true);
    setSaveError('');
    try {
      await upsertActiveHabit({ type: trackingType, target: targetNum });
      try {
        localStorage.setItem('__showHabitStartedFeedback', 'true');
      } catch {}
      router.push('/challenges');
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : 'Could not save habit. Please try again.',
      );
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (!existingHabitId) {
      router.push('/challenges');
      return;
    }
    if (!window.confirm('Remove active habit?')) return;

    setIsSaving(true);
    try {
      await archiveHabit(existingHabitId);
      router.push('/challenges');
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : 'Could not remove habit. Please try again.',
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

  if (isLoading || authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
          <h1 className="text-3xl font-bold text-neutral-900">Daily Habit</h1>
        </div>
      </div>
    );
  }

  if (authStatus === 'anonymous') {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
          <Link
            href="/challenges"
            className="mb-4 inline-flex items-center gap-2 text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)]"
          >
            ← Back
          </Link>
          <h1 className="text-3xl font-bold text-neutral-900">Daily Habit</h1>
          <div className="mt-6">
            <AuthRequiredPrompt
              title="Log in to start a daily habit."
              description="Your habit and progress are saved to your account."
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
        <Link
          href="/challenges"
          className="mb-4 inline-flex items-center gap-2 text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)]"
        >
          ← Back
        </Link>

        <h1 className="text-3xl font-bold text-neutral-900">Daily Habit</h1>

        {step === 1 ? (
          <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">
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
          </div>
        ) : (
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
            {existingHabitId && (
              <div className="mt-4 text-center">
                <button
                  onClick={handleClear}
                  disabled={isSaving}
                  className="text-sm text-red-600 hover:text-red-700 disabled:opacity-60"
                >
                  Remove habit
                </button>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
