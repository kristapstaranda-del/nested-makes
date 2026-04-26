export interface ProfileData {
  name: string;
  about: string;
  craftInterests: string[];
  avatarId?: string; // selected avatar from library
  avatarColor?: string;
}

export const defaultProfile: ProfileData = {
  name: 'Anonymous',
  about: '',
  craftInterests: [],
};

export function getProfileData(): ProfileData {
  if (typeof window === 'undefined') return defaultProfile;

  try {
    const stored = localStorage.getItem('profileData');
    if (!stored) return defaultProfile;

    const parsed = JSON.parse(stored);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.name === 'string' &&
      typeof parsed.about === 'string' &&
      Array.isArray(parsed.craftInterests)
    ) {
      const avatarId = typeof parsed.avatarId === 'string' ? parsed.avatarId : undefined;

      return {
        name: parsed.name,
        about: parsed.about,
        craftInterests: parsed.craftInterests,
        avatarId,
      } as ProfileData;
    }
  } catch (error) {
    // Ignore malformed data
  }

  return defaultProfile;
}

export function saveProfileData(data: ProfileData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('profileData', JSON.stringify(data));
  } catch (error) {
    // Ignore storage errors
  }
}