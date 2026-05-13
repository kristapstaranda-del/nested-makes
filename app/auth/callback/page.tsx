'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const rawNext = searchParams.get('next') ?? '/profile/setup';
    // Guard against open-redirect: only allow internal relative paths
    const next = rawNext.startsWith('/') ? rawNext : '/';

    let done = false;
    const go = () => {
      if (!done) {
        done = true;
        router.replace(next);
      }
    };

    // Listen for auth state — fires with INITIAL_SESSION (implicit flow processes
    // the URL hash automatically) and with SIGNED_IN after exchangeCodeForSession.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) go();
    });

    const code = searchParams.get('code');
    if (code) {
      // PKCE flow: exchange the authorisation code for a session
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        // On error we still redirect so the user isn't stuck on the spinner
        if (error) go();
      });
    } else {
      // Implicit flow: session may already exist (Supabase processed the hash
      // fragment at client init time).  getSession() is a fast localStorage read.
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) go();
      });
    }

    // Safety net: if nothing resolves in 5 s, redirect anyway
    const timeout = setTimeout(go, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-canvas)] flex items-center justify-center">
      <p className="text-sm text-[var(--color-text-muted)]">Setting up your account…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallbackHandler />
    </Suspense>
  );
}
