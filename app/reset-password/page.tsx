'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

type Status = 'idle' | 'busy' | 'sent';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setStatus('busy');

    // Password reset intentionally uses /update-password and must not be changed.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setStatus('idle');
      return;
    }

    setStatus('sent');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && status === 'idle') handleSubmit();
  };

  return (
    <main className="min-h-screen bg-[var(--color-bg-canvas)]">
      <div className="mx-auto max-w-[430px] px-4 pt-10 pb-24">

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Reset your password</h1>
          <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
            Enter your email and we&apos;ll send you a link to set a new password.
          </p>
        </div>

        <div className="rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] p-6 shadow-sm">
          {status === 'sent' ? (
            <p className="text-sm text-[var(--color-brand-primary)]">
              If an account exists for this email, we&apos;ll send a password reset link.
            </p>
          ) : (
            <>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Email"
                autoComplete="email"
                disabled={status === 'busy'}
                className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40 disabled:opacity-50"
              />

              {error && (
                <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={status === 'busy'}
                className="mt-4 w-full rounded-lg bg-[var(--color-brand-primary)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-primary-hover)] disabled:opacity-50"
              >
                {status === 'busy' ? 'Sending…' : 'Send reset link'}
              </button>
            </>
          )}
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/"
            className="text-xs text-[var(--color-text-secondary)] underline underline-offset-2 hover:text-[var(--color-text-primary)] transition-colors"
          >
            Back to sign in
          </Link>
        </div>

      </div>
    </main>
  );
}
