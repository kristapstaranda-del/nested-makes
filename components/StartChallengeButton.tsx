'use client';

import { useRouter } from 'next/navigation';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import AuthRequiredPrompt from '@/components/auth/AuthRequiredPrompt';

interface StartChallengeButtonProps {
  projectId: string | number;
}

export default function StartChallengeButton({ projectId }: StartChallengeButtonProps) {
  const router = useRouter();
  const { status } = useAuthStatus();

  if (status === 'loading') {
    return <div className="h-12 w-full rounded-lg bg-[var(--color-bg-soft)] animate-pulse" />;
  }

  if (status === 'anonymous') {
    return (
      <AuthRequiredPrompt
        title="Log in to start this challenge."
        primaryLabel="Create account"
        secondaryLabel="Log in"
      />
    );
  }

  return (
    <button
      onClick={() => router.push(`/challenges/setup?projectId=${projectId}`)}
      className="w-full rounded-lg bg-[var(--color-brand-primary)] py-3 font-semibold text-[var(--color-text-on-dark)] hover:bg-[var(--color-brand-primary-hover)]"
    >
      Start Challenge
    </button>
  );
}
