'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { getProfileData, saveProfileData } from '@/lib/profile';
import { upsertSupabaseProfile } from '@/lib/supabase/profiles';
import { AVATAR_LIBRARY } from '@/lib/avatarLibrary';

type AuthState = 'loading' | 'ready' | 'unauthenticated';

const CRAFT_OPTIONS = [
  'Knitting', 'Crochet', 'Beading', 'Weaving', 'Embroidery',
  'Sewing', 'Pottery', 'Painting', 'Woodworking', 'DIY Crafts',
];

export default function ProfileSetupPage() {
  const router = useRouter();

  const [authState, setAuthState] = useState<AuthState>('loading');
  const [userId, setUserId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [craftInterests, setCraftInterests] = useState<string[]>([]);
  const [avatarId, setAvatarId] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        setAuthState('unauthenticated');
        return;
      }
      setUserId(data.user.id);

      // Pre-populate from localStorage if anything was previously saved
      const existing = getProfileData();
      if (existing.name && existing.name !== 'Anonymous' && existing.name !== 'Maker') {
        setName(existing.name);
      }
      if (existing.about) setAbout(existing.about);
      if (existing.craftInterests.length) setCraftInterests(existing.craftInterests);
      if (existing.avatarId) setAvatarId(existing.avatarId);

      setAuthState('ready');
    });
  }, []);

  const toggleInterest = (interest: string) => {
    setCraftInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest],
    );
  };

  const handleSave = async () => {
    setBusy(true);
    setSaveError('');
    try {
      const profileData = {
        name: name.trim() || 'Maker',
        about: about.trim(),
        craftInterests,
        avatarId: avatarId || undefined,
      };
      saveProfileData(profileData);
      if (userId) {
        await upsertSupabaseProfile(userId, {
          display_name: profileData.name || null,
          about: profileData.about || null,
          craft_interests: profileData.craftInterests.length ? profileData.craftInterests : null,
          avatar_id: profileData.avatarId || null,
        });
      }
      router.push('/profile');
    } catch {
      setSaveError('Could not save your profile. Please try again.');
      setBusy(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (authState === 'loading') {
    return <div className="min-h-screen bg-[var(--color-bg-canvas)]" />;
  }

  // ── Not logged in ────────────────────────────────────────────────────────────

  if (authState === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[var(--color-bg-canvas)]">
        <div className="mx-auto max-w-[430px] px-4 pt-10 pb-24">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Log in to set up your maker profile.
          </p>
          <Link
            href="/"
            className="mt-3 inline-block text-sm text-[var(--color-brand-primary)] underline underline-offset-2 hover:text-[var(--color-brand-primary-hover)] transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // ── Setup form ───────────────────────────────────────────────────────────────

  const initials =
    name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'M';
  const selectedAvatar = avatarId ? AVATAR_LIBRARY.find((a) => a.id === avatarId) ?? null : null;

  return (
    <div className="min-h-screen bg-[var(--color-bg-canvas)]">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Set up your maker profile
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Choose a maker name and avatar. You can update these anytime from your profile.
          </p>
        </div>

        {/* Identity preview */}
        <div className="flex items-center gap-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] px-4 py-3">
          {selectedAvatar ? (
            <img
              src={selectedAvatar.imageSrc}
              alt={selectedAvatar.id}
              className="h-10 w-10 rounded-full object-cover flex-none"
            />
          ) : (
            <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-none bg-[var(--color-text-muted)]">
              {initials}
            </div>
          )}
          <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
            {name.trim() || '(your maker name)'}
          </span>
        </div>

        {/* Avatar picker */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
            Avatar
          </p>
          <div className="grid grid-cols-4 gap-2">
            {AVATAR_LIBRARY.map((avatar) => (
              <button
                key={avatar.id}
                type="button"
                onClick={() => setAvatarId(avatar.id)}
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
                  className="h-16 w-16 rounded-lg object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Maker name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
            Maker name
          </label>
          <p className="mb-1.5 text-xs text-[var(--color-text-muted)]">
            Shown on your profile and updates.
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Choose a maker name"
            className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-white px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
          />
        </div>

        {/* About */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
            About
            <span className="ml-1.5 normal-case font-normal text-[var(--color-text-muted)]">— optional</span>
          </label>
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value.slice(0, 160))}
            placeholder="Tell us about your creative practice"
            rows={3}
            className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-white px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
          />
          <p className="mt-1 text-right text-xs text-[var(--color-text-muted)]">
            {about.length}/160
          </p>
        </div>

        {/* Craft interests */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
            Crafts
            <span className="ml-1.5 normal-case font-normal text-[var(--color-text-muted)]">— optional</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {CRAFT_OPTIONS.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
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

        {/* Error */}
        {saveError && (
          <p className="text-sm text-[var(--color-danger)]">{saveError}</p>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="w-full rounded-lg bg-[var(--color-brand-primary)] py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-primary-hover)] disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save profile'}
          </button>
          <div className="text-center">
            <Link
              href="/profile"
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              Skip for now
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
