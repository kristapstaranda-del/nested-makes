'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { AVATAR_LIBRARY } from '@/lib/avatarLibrary';

interface AuthPanelProps {
  onAuthSuccess?: () => void;
}

type Mode = 'signup' | 'login';

const CRAFT_OPTIONS = [
  'Knitting', 'Crochet', 'Beading', 'Weaving', 'Embroidery',
  'Sewing', 'Pottery', 'Painting', 'Woodworking', 'DIY Crafts',
];

const NICKNAME_REGEX = /^[a-zA-Z0-9_-]{3,24}$/;

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

  // Shared fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup-only fields
  const [nickname, setNickname] = useState('');
  const [about, setAbout] = useState('');
  const [avatarId, setAvatarId] = useState('');
  const [craftInterests, setCraftInterests] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setMessage('');
  };

  const toggleInterest = (interest: string) => {
    setCraftInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest],
    );
  };

  const validateNickname = (): string => {
    if (!nickname.trim()) return 'A nickname is required.';
    if (!NICKNAME_REGEX.test(nickname.trim())) {
      return 'Use 3–24 characters. Letters, numbers, underscores or hyphens work best.';
    }
    return '';
  };

  const handleSubmit = async () => {
    setError('');
    setMessage('');

    if (mode === 'signup') {
      const nicknameError = validateNickname();
      if (nicknameError) {
        setError(nicknameError);
        return;
      }
    }

    setBusy(true);

    if (mode === 'signup') {
      const signupRedirectTo = `${window.location.origin}/auth/callback`;
      if (process.env.NODE_ENV === 'development') {
        console.log('[AuthPanel] signupRedirectTo:', signupRedirectTo);
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: signupRedirectTo,
          data: {
            nickname: nickname.trim(),
            about: about.trim() || null,
            avatar_id: avatarId || null,
            craft_interests: craftInterests.length ? craftInterests : null,
          },
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

  const previewInitials =
    nickname.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'M';
  const selectedAvatar = avatarId ? AVATAR_LIBRARY.find((a) => a.id === avatarId) ?? null : null;

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

      {/* Email + password */}
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

      {/* Signup-only: nickname + profile fields */}
      {mode === 'signup' && (
        <div className="mt-5 space-y-5 border-t border-[var(--color-border-subtle)] pt-5">

          {/* Identity preview */}
          <div className="flex items-center gap-3 rounded-xl bg-[var(--color-bg-soft)] px-3 py-2.5">
            {selectedAvatar ? (
              <img
                src={selectedAvatar.imageSrc}
                alt={selectedAvatar.id}
                className="h-9 w-9 rounded-full object-cover flex-none"
              />
            ) : (
              <div className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-none bg-[var(--color-text-muted)]">
                {previewInitials}
              </div>
            )}
            <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
              {nickname.trim() || '(your nickname)'}
            </span>
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
              Nickname <span className="text-[var(--color-danger)]">*</span>
            </label>
            <p className="mb-1.5 text-xs text-[var(--color-text-muted)]">
              This is how other makers will see you. It can be your name, a craft-inspired nickname, or something anonymous.
            </p>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. yarn_witch or PotteryPete"
              autoComplete="username"
              className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
            />
          </div>

          {/* Avatar picker */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
              Avatar <span className="ml-1 normal-case font-normal">— optional</span>
            </p>
            <div className="grid grid-cols-6 gap-1.5">
              {AVATAR_LIBRARY.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => setAvatarId(avatarId === avatar.id ? '' : avatar.id)}
                  className={`flex items-center justify-center rounded-lg border-2 transition-all hover:scale-105 ${
                    avatarId === avatar.id
                      ? 'border-[var(--color-brand-primary)] ring-1 ring-[var(--color-brand-primary)]'
                      : 'border-[var(--color-border-subtle)] hover:border-[var(--color-text-muted)]'
                  }`}
                  title={`Avatar ${avatar.id}`}
                >
                  <img
                    src={avatar.imageSrc}
                    alt={`Avatar ${avatar.id}`}
                    className="h-10 w-10 rounded-md object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Craft interests */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
              Crafts <span className="ml-1 normal-case font-normal">— optional</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CRAFT_OPTIONS.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                    craftInterests.includes(interest)
                      ? 'bg-[var(--color-brand-primary)] text-white'
                      : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* About */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
              About <span className="ml-1 normal-case font-normal">— optional</span>
            </label>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value.slice(0, 160))}
              placeholder="Tell us about your creative practice"
              rows={2}
              className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
            />
            <p className="mt-1 text-right text-xs text-[var(--color-text-muted)]">{about.length}/160</p>
          </div>
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
