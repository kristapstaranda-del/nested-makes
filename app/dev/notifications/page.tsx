'use client';

/**
 * Phase 2.4: the legacy notification simulator was tied to MOCK_PROFILES and
 * the localStorage-based reaction/reply stores. Both were retired during the
 * Supabase migration. This page is kept as a minimal placeholder so the route
 * doesn't 404 if anyone has it bookmarked. Safe to delete once unreferenced.
 */

import Link from 'next/link';

export default function NotificationsDevPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[430px] px-4 pt-10 pb-24">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
          Notifications dev tool
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          This simulator was retired during the Supabase migration.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)]"
        >
          ← Back home
        </Link>
      </div>
    </div>
  );
}
