'use client';

import Link from 'next/link';

interface AuthRequiredPromptProps {
  title: string;
  description?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}

export default function AuthRequiredPrompt({
  title,
  description,
  primaryLabel = 'Create account',
  secondaryLabel = 'Log in',
}: AuthRequiredPromptProps) {
  return (
    <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-5 py-6 text-center">
      <p className="text-sm font-medium text-[var(--color-text-primary)]">{title}</p>
      {description && (
        <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">{description}</p>
      )}
      <div className="mt-4 flex justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-primary-hover)]"
        >
          {primaryLabel}
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-[var(--color-border-subtle)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          {secondaryLabel}
        </Link>
      </div>
    </div>
  );
}
