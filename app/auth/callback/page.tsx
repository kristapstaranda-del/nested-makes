'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { upsertSupabaseProfile } from '@/lib/supabase/profiles';
import { saveProfileData } from '@/lib/profile';

async function upsertProfileFromMetadata(userId: string): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const meta = data.user?.user_metadata ?? {};

  const nickname = typeof meta.nickname === 'string' ? meta.nickname : null;
  const about = typeof meta.about === 'string' ? meta.about : null;
  const avatarId = typeof meta.avatar_id === 'string' ? meta.avatar_id : null;
  const craftInterests = Array.isArray(meta.craft_interests) ? meta.craft_interests : null;

  await upsertSupabaseProfile(userId, {
    display_name: nickname || null,
    about: about || null,
    avatar_id: avatarId || null,
    craft_interests: craftInterests || null,
  });

  // Mirror into localStorage so the profile page renders without a round-trip
  saveProfileData({
    nickname: nickname || 'Maker',
    about: about || '',
    craftInterests: craftInterests ?? [],
    avatarId: avatarId || undefined,
  });
}

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let done = false;

    const redirectTo = (path: string) => {
      if (!done) {
        done = true;
        router.replace(path);
      }
    };

    const handleSession = async (userId: string) => {
      try {
        await upsertProfileFromMetadata(userId);
        redirectTo('/');
      } catch {
        // Profile upsert failed — send to manual setup
        redirectTo('/profile/setup');
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        handleSession(session.user.id);
      }
    });

    const code = searchParams.get('code');
    if (code) {
      // PKCE flow: exchange the authorisation code for a session
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error || !data.session) {
          redirectTo('/profile/setup');
        }
        // handleSession fires via onAuthStateChange when exchange succeeds
      });
    } else {
      // Implicit flow: session may already exist (Supabase processed the hash
      // fragment at client init time). getSession() is a fast localStorage read.
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          handleSession(data.session.user.id);
        }
      });
    }

    // Safety net: if nothing resolves in 5 s, send to setup
    const timeout = setTimeout(() => redirectTo('/profile/setup'), 5000);

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
