'use client';

import { useState, useEffect } from 'react';
import { ProfileData } from '@/lib/profile';
import { AVATAR_LIBRARY } from '@/lib/avatarLibrary';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileData: ProfileData;
  onSave: (data: ProfileData) => void;
}

const predefinedInterests = [
  'Knitting',
  'Crochet',
  'Beading',
  'Weaving',
  'Embroidery',
  'Sewing',
  'Pottery',
  'Painting',
  'Woodworking',
  'DIY Crafts',
];

export default function EditProfileModal({
  isOpen,
  onClose,
  profileData,
  onSave,
}: EditProfileModalProps) {
  const [name, setName] = useState(profileData.name);
  const [about, setAbout] = useState(profileData.about);
  const [craftInterests, setCraftInterests] = useState<string[]>(profileData.craftInterests);
  const [avatarId, setAvatarId] = useState(profileData.avatarId || '');

  useEffect(() => {
    if (isOpen) {
      setName(profileData.name);
      setAbout(profileData.about);
      setCraftInterests([...profileData.craftInterests]);
      setAvatarId(profileData.avatarId || '');
    }
  }, [isOpen, profileData]);

  const handleSave = () => {
    onSave({
      name,
      about,
      craftInterests,
      avatarId: avatarId || undefined,
    });
    onClose();
  };

  const toggleInterest = (interest: string) => {
    setCraftInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  // Get initials for avatar preview
  const initials =
    name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('') || 'A';

  const selectedAvatar = avatarId
    ? AVATAR_LIBRARY.find(avatar => avatar.id === avatarId)
    : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-w-md max-h-[90dvh] rounded-xl bg-[var(--color-bg-elevated)] shadow-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 p-5 pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {profileData.name ? 'Edit Profile' : 'Create Profile'}
            </h2>
            <button
              onClick={onClose}
              className="rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]/40"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tiny Preview Line */}
        <div className="flex-shrink-0 px-5 py-3 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2">
            {selectedAvatar && (
              <img
                src={selectedAvatar.imageSrc}
                alt={selectedAvatar.id}
                className="h-8 w-8 rounded-full flex-shrink-0 object-cover"
              />
            )}
            {!selectedAvatar && (
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0 bg-[var(--color-text-muted)]">
                {initials}
              </div>
            )}
            <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
              {name || '(your maker name)'}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-5">
            {/* Avatar Selection */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Avatar
              </label>
              <div className="grid grid-cols-4 gap-2">
                {AVATAR_LIBRARY.map((avatar) => (
                  <button
                    key={avatar.id}
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
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                Maker name
              </label>
              <p className="mb-1.5 text-xs text-[var(--color-text-muted)]">Shown on your profile and updates.</p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Choose a maker name"
                className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-brand-primary)] focus:outline-none"
              />
            </div>

            {/* About Me */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                About
              </label>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value.slice(0, 160))}
                placeholder="Tell us about your creative practice"
                rows={3}
                maxLength={160}
                className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-brand-primary)] focus:outline-none"
              />
            </div>

            {/* Craft Interests */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Crafts
              </label>
              <div className="flex flex-wrap gap-2">
                {predefinedInterests.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`rounded-full px-3 py-1.5 text-sm transition-colors duration-200 ${
                      craftInterests.includes(interest)
                        ? 'bg-[var(--color-brand-primary)] text-[var(--color-text-on-dark)]'
                        : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-5 pt-3 border-t border-[var(--color-border-subtle)]">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-[var(--color-border-subtle)] py-2.5 font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)] transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 rounded-lg bg-[var(--color-brand-primary)] py-2.5 font-medium text-[var(--color-text-on-dark)] hover:bg-[var(--color-brand-primary-hover)] transition-colors duration-200"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
