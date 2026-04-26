'use client';

import { useRouter } from 'next/navigation';

interface StartChallengeButtonProps {
  projectId: string;
}

export default function StartChallengeButton({
  projectId,
}: StartChallengeButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/challenges/setup?projectId=${projectId}`);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full rounded-lg bg-[var(--color-brand-primary)] py-3 font-semibold text-[var(--color-text-on-dark)] hover:bg-[var(--color-brand-primary-hover)]"
    >
      Start Challenge
    </button>
  );
}
