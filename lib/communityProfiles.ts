/**
 * communityProfiles.ts
 *
 * Public profile data layer for Community Layer v1.
 *
 * Pre-auth architecture:
 *   - Each device generates a stable userId once (stored in localStorage)
 *   - New check-ins include this authorId so profiles are linkable
 *   - A small set of seed community members provides social presence from day one
 *   - getPublicProfile(id) is the single lookup that handles both cases
 *
 * Future migration path:
 *   - Replace getOrCreateUserId() with auth-issued token
 *   - Replace getCurrentUserPublicProfile() with API fetch
 *   - Replace MOCK_PROFILES with real database query
 */

import { getProfileData } from './profile';
import { getAllAchievements, type Achievement } from './achievements';
import { getUserProjects, getProjectCoverImage } from './userProjects';
import { projects as staticProjects } from '@/app/data/projects';
import { sanitizeCoverImage } from './imageUtils';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PublicCheckInEntry {
  id: string;
  message: string;
  date: string; // YYYY-MM-DD
  displayName: string;
  authorId?: string;
  imageUrl?: string; // optional base64 data URL for progress photo
}

export interface PublicProjectPreview {
  id: string;
  title: string;
  category: string;
  coverImage?: string; // base64 data URL or undefined
  description?: string;
}

export interface PublicProfile {
  id: string;
  displayName: string;
  about: string;
  craftInterests: string[];
  avatarId?: string;
  avatarColor?: string;
  publicBadges: Achievement[]; // only visibility === 'public' earned badges
  recentCheckIns: PublicCheckInEntry[];
  finishedProjects: PublicProjectPreview[];
  isMock?: boolean;
}

// ── Current user stable ID ─────────────────────────────────────────────────

/**
 * Returns a stable random user ID for this device/browser.
 * Generated once and persisted to localStorage.
 * Used as authorId on new check-ins and as the public profile URL key.
 */
export function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'anon';
  const stored = localStorage.getItem('hobbyBuddyUserId');
  if (stored && stored.length > 0) return stored;
  const id = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  try { localStorage.setItem('hobbyBuddyUserId', id); } catch {}
  return id;
}

// ── Public badge filter ────────────────────────────────────────────────────

/**
 * Returns only earned achievements that are safe to display publicly.
 * Filters out habit-based (visibility: 'private') and challenge-only (visibility: 'profile') badges.
 * Only community achievements (visibility: 'public') are shown on public profiles.
 */
export function getPublicSafeBadges(): Achievement[] {
  return getAllAchievements().filter(
    (a) => a.earned && a.visibility === 'public'
  );
}

// ── Finished projects for current user ────────────────────────────────────

/**
 * Derives finished project previews from the current user's archived challenges.
 * Cross-references projectId against user-created projects, then static curated projects.
 * Returns up to 3 previews, most recently archived first.
 */
function getCurrentUserFinishedProjects(): PublicProjectPreview[] {
  try {
    const raw = localStorage.getItem('archivedChallenges');
    if (!raw) return [];
    const archived = JSON.parse(raw);
    if (!Array.isArray(archived)) return [];

    const userProjects = getUserProjects();
    const previews: PublicProjectPreview[] = [];

    for (const challenge of archived) {
      if (!challenge || typeof challenge.projectId !== 'string') continue;
      const pid = String(challenge.projectId);

      // Try user-created project first
      const userProject = userProjects.find((p) => p.id === pid);
      if (userProject) {
        previews.push({
          id: userProject.id,
          title: userProject.title,
          category: userProject.category,
          coverImage: getProjectCoverImage(userProject),
          description: userProject.description || undefined,
        });
        if (previews.length >= 3) break;
        continue;
      }

      // Fall back to static curated project
      const staticProject = staticProjects.find((p) => String(p.id) === pid);
      if (staticProject) {
        previews.push({
          id: String(staticProject.id),
          title: staticProject.title,
          category: staticProject.craftType,
          description: staticProject.description || undefined,
        });
        if (previews.length >= 3) break;
      }
    }

    return previews;
  } catch {
    return [];
  }
}

// ── Current user public profile ────────────────────────────────────────────

function getCurrentUserPublicProfile(userId: string): PublicProfile {
  const profile = getProfileData();
  const publicBadges = getPublicSafeBadges();
  const finishedProjects = getCurrentUserFinishedProjects();

  let recentCheckIns: PublicCheckInEntry[] = [];
  try {
    const raw = localStorage.getItem('publicCheckIns');
    if (raw) {
      const all = JSON.parse(raw) as any[];
      recentCheckIns = all
        .filter(
          (ci) =>
            ci &&
            typeof ci === 'object' &&
            typeof ci.message === 'string' &&
            typeof ci.date === 'string' &&
            ci.authorId === userId
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
        .map((ci) => ({
          id: String(ci.id ?? ''),
          message: ci.message,
          date: ci.date,
          displayName: ci.displayName ?? profile.name,
          authorId: ci.authorId,
          imageUrl: sanitizeCoverImage(ci.imageUrl),
        }));
    }
  } catch {}

  return {
    id: userId,
    displayName: profile.name || 'Maker',
    about: profile.about || '',
    craftInterests: Array.isArray(profile.craftInterests) ? profile.craftInterests : [],
    avatarId: profile.avatarId,
    publicBadges,
    recentCheckIns,
    finishedProjects,
  };
}

// ── Seed community members ─────────────────────────────────────────────────

const MOCK_BADGE_SPARK: Achievement = {
  id: 'community-spark',
  title: 'Community Spark',
  emoji: '✨',
  description: 'Shared their first public check-in',
  earned: true,
  category: 'community',
  visibility: 'public',
  sourceType: 'community',
};

const MOCK_BADGE_CHATTY: Achievement = {
  id: 'chatty-crafter',
  title: 'Chatty Crafter',
  emoji: '💬',
  description: 'Shared 3 public check-ins',
  earned: true,
  category: 'community',
  visibility: 'public',
  sourceType: 'community',
};

export const MOCK_PROFILES: PublicProfile[] = [
  {
    id: 'mock_maya',
    displayName: 'Maya K.',
    about: 'Knitting cozy things one stitch at a time. Based in Portland.',
    craftInterests: ['Knitting', 'Crochet'],
    avatarId: 'avatar1',
    publicBadges: [MOCK_BADGE_SPARK, MOCK_BADGE_CHATTY],
    recentCheckIns: [
      { id: 'mk1', message: 'Finished the ribbing on my new beanie — the yarn is so soft!', date: '2026-03-28', displayName: 'Maya K.', authorId: 'mock_maya' },
      { id: 'mk2', message: 'Trying out a new cable pattern today. Fingers crossed!', date: '2026-03-26', displayName: 'Maya K.', authorId: 'mock_maya' },
      { id: 'mk3', message: 'Getting back into my knitting routine after a busy week.', date: '2026-03-22', displayName: 'Maya K.', authorId: 'mock_maya' },
    ],
    finishedProjects: [
      { id: 'mp_mk1', title: 'Chunky Ribbed Beanie', category: 'Knitting', description: 'A warm ribbed beanie knit in chunky merino — the kind you reach for every morning in November.' },
      { id: 'mp_mk2', title: 'Mini Crochet Tote', category: 'Crochet', description: 'A small everyday tote crocheted in natural cotton, sturdy enough for books and a travel mug.' },
      { id: 'mp_mk3', title: 'Striped Wrist Warmers', category: 'Knitting', description: 'Quick knit wrist warmers in two colours — a weekend project that turned into a favourite pair.' },
    ],
    isMock: true,
  },
  {
    id: 'mock_sam',
    displayName: 'Sam O.',
    about: 'Embroidery and slow stitching on quiet evenings.',
    craftInterests: ['Embroidery', 'Sewing'],
    avatarId: 'avatar2',
    publicBadges: [MOCK_BADGE_SPARK],
    recentCheckIns: [
      { id: 'so1', message: 'Small floral hoop almost done — loving this thread palette.', date: '2026-03-27', displayName: 'Sam O.', authorId: 'mock_sam' },
      { id: 'so2', message: 'Started a new botanical piece. Progress feels good today.', date: '2026-03-24', displayName: 'Sam O.', authorId: 'mock_sam' },
    ],
    finishedProjects: [
      { id: 'mp_so1', title: 'Wildflower Hoop', category: 'Embroidery', description: 'A meadow-inspired embroidery hoop with layered wildflowers in muted thread tones.' },
      { id: 'mp_so2', title: 'Linen Tote Bag', category: 'Sewing', description: 'A simple flat-bottomed tote sewn from undyed linen — minimal and just the right size.' },
    ],
    isMock: true,
  },
  {
    id: 'mock_jo',
    displayName: 'Jo A.',
    about: 'Pottery weekends. Slow progress is still progress.',
    craftInterests: ['Pottery', 'Painting'],
    avatarId: 'avatar3',
    publicBadges: [MOCK_BADGE_SPARK, MOCK_BADGE_CHATTY],
    recentCheckIns: [
      { id: 'ja1', message: 'Trimmed two bowls today. Clay dried a bit faster than expected.', date: '2026-03-29', displayName: 'Jo A.', authorId: 'mock_jo' },
      { id: 'ja2', message: 'First firing went well! A couple of small cracks but mostly solid.', date: '2026-03-25', displayName: 'Jo A.', authorId: 'mock_jo' },
    ],
    finishedProjects: [
      { id: 'mp_ja1', title: 'Speckled Breakfast Bowl', category: 'Pottery', description: 'A hand-thrown stoneware bowl with a speckled glaze — used every morning without fail.' },
      { id: 'mp_ja2', title: 'Watercolour Botanicals Print', category: 'Painting', description: 'A loose watercolour study of three botanical specimens, painted on cold-press paper.' },
      { id: 'mp_ja3', title: 'Pinch Pot Planter', category: 'Pottery', description: 'A small asymmetric pinch pot, now home to a little succulent on the windowsill.' },
    ],
    isMock: true,
  },
];

// ── Main lookup ────────────────────────────────────────────────────────────

/**
 * Look up a public profile by ID.
 * - Matches the current user's generated userId → derives live from localStorage
 * - Matches a mock profile ID → returns static seed data
 * - Unknown ID → returns null (show graceful not-found state)
 */
export function getPublicProfile(id: string): PublicProfile | null {
  if (typeof window !== 'undefined') {
    const currentUserId = localStorage.getItem('hobbyBuddyUserId');
    if (currentUserId && id === currentUserId) {
      return getCurrentUserPublicProfile(currentUserId);
    }
  }
  return MOCK_PROFILES.find((p) => p.id === id) ?? null;
}
