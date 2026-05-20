export interface ProfileData {
  nickname: string;
  about: string;
  craftInterests: string[];
  avatarId?: string;
  avatarColor?: string;
}

export const defaultProfile: ProfileData = {
  nickname: 'Maker',
  about: '',
  craftInterests: [],
};

export function getProfileData(): ProfileData {
  if (typeof window === 'undefined') return defaultProfile;

  try {
    const stored = localStorage.getItem('profileData');
    if (!stored) return defaultProfile;

    const parsed = JSON.parse(stored);
    if (typeof parsed === 'object' && parsed !== null && typeof parsed.about === 'string' && Array.isArray(parsed.craftInterests)) {
      // Support both new 'nickname' key and legacy 'name' key
      const nickname =
        typeof parsed.nickname === 'string' ? parsed.nickname :
        typeof parsed.name === 'string' ? parsed.name :
        '';

      return {
        nickname,
        about: parsed.about,
        craftInterests: parsed.craftInterests,
        avatarId: typeof parsed.avatarId === 'string' ? parsed.avatarId : undefined,
      };
    }
  } catch {
    // Ignore malformed data
  }

  return defaultProfile;
}

export function saveProfileData(data: ProfileData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('profileData', JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear the local profile cache. Called on logout so the next signed-in user
 * (or anonymous visitor) doesn't see the previous user's nickname/avatar.
 */
export function clearProfileData(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('profileData');
  } catch {
    // Ignore storage errors
  }
}
