'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

interface AuthPanelProps {
  onAuthSuccess?: () => void;
}

type Mode = 'signup' | 'login';

function friendlyError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return "We couldn't log you in. Check your email and password, or create an account first.";
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before logging in. Check your inbox for the confirmation link.';
  }
  if (lower.includes('user already registered') || lower.includes('already registered')) {
    return 'An account with this email already exists. Try logging in instead.';
  }
  return message;
}

export default function AuthPanel({ onAuthSuccess }: AuthPanelProps) {
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setMessage('');
  };

  const handleSubmit = async () => {
    setError('');
    setMessage('');
    setBusy(true);

    if (mode === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/profile?setup=1`,
        },
      });
      setBusy(false);
      if (signUpError) {
        setError(friendlyError(signUpError.message));
        return;
      }
      if (data.user && data.session) {
        onAuthSuccess?.();
      } else {
        setMessage(
          'Check your email to confirm your account. If you already have an account with this email, log in instead or reset your password.',
        );
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (signInError) {
        setError(friendlyError(signInError.message));
        return;
      }
      onAuthSuccess?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !busy) handleSubmit();
  };

  return (
    <div className="rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] p-6 shadow-sm">
      {/* Mode tabs */}
      <div className="flex gap-1 rounded-xl bg-[var(--color-bg-soft)] p-1 mb-4">
        {(['signup', 'login'] as const).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              mode === m
                ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            {m === 'signup' ? 'Create account' : 'Log in'}
          </button>
        ))}
      </div>

      {/* Helper text */}
      <p className="mb-4 text-xs text-[var(--color-text-muted)]">
        {mode === 'signup'
          ? 'Create an account to save your projects and updates.'
          : 'Use the email and password you used when creating your account.'}
      </p>

      {/* Fields */}
      <div className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Email"
          autoComplete="email"
          className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
        />
      </div>

      {/* Forgot password — login mode only */}
      {mode === 'login' && (
        <div className="mt-2 text-right">
          <Link
            href="/reset-password"
            className="text-xs text-[var(--color-text-muted)] underline underline-offset-2 hover:text-[var(--color-text-secondary)] transition-colors"
          >
            Forgot password?
          </Link>
        </div>
      )}

      {/* Feedback */}
      {error && (
        <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p>
      )}
      {message && (
        <p className="mt-3 text-sm text-[var(--color-brand-primary)]">{message}</p>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={busy}
        className="mt-4 w-full rounded-lg bg-[var(--color-brand-primary)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-primary-hover)] disabled:opacity-50"
      >
        {busy ? 'One moment…' : mode === 'signup' ? 'Create account' : 'Log in'}
      </button>
    </div>
  );
}
