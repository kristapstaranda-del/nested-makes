'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

type Status = 'loading' | 'ready' | 'busy' | 'success' | 'no-session';

export default function UpdatePasswordPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // PASSWORD_RECOVERY fires when Supabase processes the reset hash from the email link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setStatus('ready');
      }
    });

    // Fallback: recovery event may have already fired before this component mounted
    supabase.auth.getSession().then(({ data }) => {
      setStatus((prev) => {
        if (prev !== 'loading') return prev;
        return data.session ? 'ready' : 'no-session';
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    setError('');

    if (!newPassword) {
      setError('Enter a new password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setStatus('busy');
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      setError(updateError.message);
      setStatus('ready');
      return;
    }

    setStatus('success');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && status === 'ready') handleSubmit();
  };

  return (
    <main className="min-h-screen bg-[var(--color-bg-canvas)]">
      <div className="mx-auto max-w-[430px] px-4 pt-10 pb-24">

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Set a new password</h1>
          <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
            Choose a new password for your account.
          </p>
        </div>

        <div className="rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] p-6 shadow-sm">

          {status === 'loading' && (
            <p className="text-sm text-[var(--color-text-muted)]">Checking reset link…</p>
          )}

          {status === 'no-session' && (
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                This reset link may be expired or invalid.
              </p>
              <Link
                href="/reset-password"
                className="mt-3 inline-block text-sm text-[var(--color-brand-primary)] underline underline-offset-2 hover:text-[var(--color-brand-primary-hover)] transition-colors"
              >
                Request a new password reset link
              </Link>
            </div>
          )}

          {status === 'success' && (
            <div>
              <p className="text-sm text-[var(--color-brand-primary)]">
                Your password has been updated. You can now log in.
              </p>
              <Link
                href="/"
                className="mt-3 inline-block text-sm text-[var(--color-text-secondary)] underline underline-offset-2 hover:text-[var(--color-text-primary)] transition-colors"
              >
                Go to sign in
              </Link>
            </div>
          )}

          {(status === 'ready' || status === 'busy') && (
            <>
              <div className="space-y-3">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="New password"
                  autoComplete="new-password"
                  disabled={status === 'busy'}
                  className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40 disabled:opacity-50"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  disabled={status === 'busy'}
                  className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40 disabled:opacity-50"
                />
              </div>

              {error && (
                <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={status === 'busy'}
                className="mt-4 w-full rounded-lg bg-[var(--color-brand-primary)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-primary-hover)] disabled:opacity-50"
              >
                {status === 'busy' ? 'Updating…' : 'Update password'}
              </button>
            </>
          )}

        </div>

        {status !== 'success' && (
          <div className="mt-5 text-center">
            <Link
              href="/"
              className="text-xs text-[var(--color-text-secondary)] underline underline-offset-2 hover:text-[var(--color-text-primary)] transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}
