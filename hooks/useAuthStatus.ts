'use client';

import { useEffect, useState } from 'react';
import { type User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface UseAuthStatusResult {
  status: AuthStatus;
  user: User | null;
}

export function useAuthStatus(): UseAuthStatusResult {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (data.user) {
        setUser(data.user);
        setStatus('authenticated');
      } else {
        setStatus('anonymous');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('anonymous');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { status, user };
}
