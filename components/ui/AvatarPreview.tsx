'use client';

import { ProfileData } from '@/lib/profile';
import { getAvatarById } from '@/lib/avatarLibrary';

interface AvatarPreviewProps {
  profile: ProfileData;
}

/**
 * Small, lightweight profile preview card
 * Shows avatar, name, maker line, and craft summary
 * Used in EditProfileModal to give live feedback
 */
export default function AvatarPreview({ profile }: AvatarPreviewProps) {
  const initials =
    profile.name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('') || 'A';

  const avatar = getAvatarById(profile.avatarId);

  const displayCrafts = profile.craftInterests.slice(0, 2);

  return (
    <div className="rounded-lg bg-[var(--color-bg-soft)] border border-[var(--color-border-subtle)] p-4 mb-6">
      {/* Avatar + Name + Maker Line */}
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {avatar ? (
            <img
              src={avatar.imageSrc}
              alt={avatar.id}
              className="w-12 h-12 rounded-full object-cover border border-[var(--color-border-subtle)]"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold text-white border border-[var(--color-border-subtle)]"
              style={{ backgroundColor: profile.avatarColor ?? '#6E8F7A' }}
            >
              {initials}
            </div>
          )}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            {profile.name || 'Your name'}
          </p>
        </div>
      </div>

      {/* Craft Chips */}
      {displayCrafts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {displayCrafts.map((craft) => (
            <span
              key={craft}
              className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)]"
            >
              {craft}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
