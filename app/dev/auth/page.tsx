'use client';

import { useEffect, useState } from 'react';
import { type AuthUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

type SessionStatus = 'loading' | 'ready';

export default function AuthTestPage() {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formBusy, setFormBusy] = useState(false);

  // Check for an existing session on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setSessionStatus('ready');
    });
  }, []);

  const clearFormState = () => {
    setFormError('');
    setFormMessage('');
  };

  const handleSignUp = async () => {
    clearFormState();
    setFormBusy(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setFormBusy(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    if (data.user && data.session) {
      setUser(data.user);
      setFormMessage(`Signed up and logged in as ${data.user.email}`);
    } else {
      setFormMessage('Signed up — check your email to confirm your account.');
    }
  };

  const handleLogin = async () => {
    clearFormState();
    setFormBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setFormBusy(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setUser(data.user);
    setFormMessage(`Logged in as ${data.user.email}`);
  };

  const handleLogout = async () => {
    clearFormState();
    setFormBusy(true);
    const { error } = await supabase.auth.signOut();
    setFormBusy(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setUser(null);
    setFormMessage('Logged out.');
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
        <h1 className="text-2xl font-semibold text-neutral-900">Supabase auth test</h1>
        <p className="mt-1 text-sm text-neutral-500">Dev only — email/password signup, login, logout</p>

        {/* Current session */}
        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-neutral-700">Current session</p>
          {sessionStatus === 'loading' ? (
            <p className="mt-2 text-sm text-neutral-400">Loading…</p>
          ) : user ? (
            <div className="mt-2 space-y-1">
              <p className="text-sm text-green-700 font-medium">Logged in</p>
              <p className="text-xs text-neutral-500">Email: {user.email}</p>
              <p className="text-xs text-neutral-400 break-all">ID: {user.id}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-neutral-400">No active session.</p>
          )}
        </div>

        {/* Form */}
        <div className="mt-4 rounded-xl bg-white p-5 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-neutral-700">Email / password</p>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400"
          />

          {formError && (
            <p className="text-sm text-red-500">{formError}</p>
          )}
          {formMessage && (
            <p className="text-sm text-green-700">{formMessage}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSignUp}
              disabled={formBusy}
              className="flex-1 rounded-lg bg-neutral-800 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              Sign up
            </button>
            <button
              onClick={handleLogin}
              disabled={formBusy}
              className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Log in
            </button>
          </div>

          {user && (
            <button
              onClick={handleLogout}
              disabled={formBusy}
              className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Log out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
