'use client';

import { useRouter } from 'next/navigation';

interface StartProjectButtonProps {
  projectId: string;
}

export default function StartProjectButton({ projectId }: StartProjectButtonProps) {
  const router = useRouter();

  const handleStartProject = () => {
    localStorage.setItem('activeChallenge', projectId);
    router.push('/challenges');
  };

  return (
    <button
      onClick={handleStartProject}
      className="w-full rounded-lg bg-[var(--color-brand-primary)] py-3 font-semibold text-[var(--color-text-on-dark)] hover:bg-[var(--color-brand-primary-hover)]"
    >
      Start Project
    </button>
  );
}
