'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

interface AuthPanelProps {
  onAuthSuccess?: () => void;
}

type Mode = 'login' | 'signup';

export default function AuthPanel({ onAuthSuccess }: AuthPanelProps) {
  const [mode, setMode] = useState<Mode>('login');
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
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      setBusy(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.user && data.session) {
        setMessage(`Welcome! You're signed in as ${data.user.email}.`);
        onAuthSuccess?.();
      } else {
        setMessage('Check your email to confirm your account.');
      }
    } else {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (signInError) {
        setError(signInError.message);
        return;
      }
      setMessage(`Welcome back, ${data.user.email}!`);
      onAuthSuccess?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !busy) handleSubmit();
  };

  return (
    <div className="rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] p-6 shadow-sm">
      {/* Mode tabs */}
      <div className="flex gap-1 rounded-xl bg-[var(--color-bg-soft)] p-1 mb-5">
        {(['login', 'signup'] as const).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              mode === m
                ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            {m === 'login' ? 'Log in' : 'Sign up'}
          </button>
        ))}
      </div>

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
        {busy ? 'One moment…' : mode === 'login' ? 'Log in' : 'Create account'}
      </button>
    </div>
  );
}
