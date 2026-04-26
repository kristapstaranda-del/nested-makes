/**
 * Avatar Library - Character Avatars
 *
 * Curated collection of diverse character avatars.
 * Each avatar is defined by:
 * - id: unique identifier
 * - imageSrc: path to avatar image
 */

export interface Avatar {
  id: string;
  imageSrc: string;
}

export const AVATAR_LIBRARY: Avatar[] = [
  { id: 'avatar1', imageSrc: '/avatars/avatar-1.png' },
  { id: 'avatar2', imageSrc: '/avatars/avatar-2.png' },
  { id: 'avatar3', imageSrc: '/avatars/avatar-3.png' },
  { id: 'avatar4', imageSrc: '/avatars/avatar-4.png' },
  { id: 'avatar5', imageSrc: '/avatars/avatar-5.png' },
  { id: 'avatar6', imageSrc: '/avatars/avatar-6.png' },
  { id: 'avatar7', imageSrc: '/avatars/avatar-7.png' },
  { id: 'avatar8', imageSrc: '/avatars/avatar-8.png' },
  { id: 'avatar9', imageSrc: '/avatars/avatar-9.png' },
  { id: 'avatar10', imageSrc: '/avatars/avatar-10.png' },
  { id: 'avatar11', imageSrc: '/avatars/avatar-11.png' },
  { id: 'avatar12', imageSrc: '/avatars/avatar-12.png' },
];

/**
 * Get avatar by ID
 */
export function getAvatarById(id?: string): Avatar | null {
  if (!id) return null;
  return AVATAR_LIBRARY.find((avatar) => avatar.id === id) || null;
}

/**
 * Validate that avatarId exists in library
 */
export function isValidAvatarId(id?: string): boolean {
  return id ? !!getAvatarById(id) : true;
}
