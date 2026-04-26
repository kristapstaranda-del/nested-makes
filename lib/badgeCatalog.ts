/**
 * Badge Catalog
 * Centralized source of truth for badge visual metadata and presentation
 * Separates achievement computation logic from visual presentation
 * 
 * Philosophy:
 * - achievements.ts = LOGIC layer (when badges are earned)
 * - badgeCatalog.ts = PRESENTATION layer (what badges look like, labels, metadata)
 * - UI components = RENDERING layer (how they display)
 */

/**
 * Visual tone/color accent for a badge
 * Maps to CSS variables defined in globals.css
 */
type AccentTone =
  | 'brand-primary'
  | 'brand-secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'reward'
  | 'accent';

/**
 * Rarity tier for visual differentiation
 * Helps UI render appropriate emphasis without being loud
 * - common: entry-level achievements, encourages new habits
 * - meaningful: mid-tier, shows progress
 * - milestone: significant accomplishments
 * - special: rare, premium achievements
 */
type Rarity = 'common' | 'meaningful' | 'milestone' | 'special';

/**
 * Visual motif / metaphor for the badge
 * Allows future extensibility to custom SVG art without changing the system
 * Used for conceptual consistency and future design work
 */
type BadgeMotif =
  | 'flame' // streaks, momentum, warmth
  | 'star' // mastery, excellence, consistency
  | 'spark' // connection, energy, progress
  | 'ribbon' // achievement, completion
  | 'button' // small wins, craft elements
  | 'needle' // craft skill, creation
  | 'yarn' // craft material, artistry
  | 'spool' // crafting, preparation
  | 'stitch' // detail, care, connection
  | 'chat' // community, conversation
  | 'heart' // care, community warmth
  | 'leaf' // growth, organic progress
  | 'flower' // creative bloom
  | 'patch' // collectible token aesthetic;

/**
 * Single badge catalog entry
 * Contains all metadata needed for badge rendering and presentation
 */
export interface BadgeCatalogEntry {
  /** Unique identifier matching achievement.id */
  id: string;

  /** Display title */
  title: string;

  /** Optional shorter title for compact contexts */
  shortTitle?: string;

  /** Description of what triggers the badge */
  description: string;

  /** Achievement category */
  category: 'habit' | 'challenge' | 'community' | 'consistency';

  /** Visibility scope */
  visibility: 'private' | 'profile' | 'public';

  /** Visual motif/metaphor for the badge (allows future art extensibility) */
  motif: BadgeMotif;

  /** Emoji for quick visual scanning (lightweight, always available) */
  emoji: string;

  /** Icon name/key for future icon system extensibility */
  iconName: string;

  /** Rarity tier for subtle visual differentiation */
  rarity: Rarity;

  /** CSS variable accent color (from globals.css) */
  accentTone: AccentTone;

  /** Warm post-unlock message shown in inline feedback when this badge is earned */
  unlockLabel?: string;

  /** Should this badge be eligible for profile featured display? */
  profileFeaturedEligible: boolean;

  /** Should this badge be eligible for public display (username badge, social)? */
  publicDisplayEligible: boolean;
}

/**
 * Complete badge catalog
 * Maps achievement IDs to their visual presentation metadata
 * Used as source of truth for all badge rendering and labeling
 */
export const BADGE_CATALOG: Record<string, BadgeCatalogEntry> = {
  // HABIT ACHIEVEMENTS (Private progress tracking)
  'streak-keeper': {
    id: 'streak-keeper',
    title: 'Streak Keeper',
    shortTitle: 'Keeper',
    description: 'Maintain a 3-day habit streak',
    category: 'habit',
    visibility: 'private',
    motif: 'flame',
    emoji: '🔥',
    iconName: 'fire',
    rarity: 'common',
    accentTone: 'brand-primary',
    unlockLabel: 'Three days in a row — a small habit is forming.',
    profileFeaturedEligible: true,
    publicDisplayEligible: false,
  },

  'knitting-ninja': {
    id: 'knitting-ninja',
    title: 'Knitting Ninja',
    shortTitle: 'Ninja',
    description: 'Reach a 7-day habit streak',
    category: 'habit',
    visibility: 'private',
    motif: 'star',
    emoji: '🥋',
    iconName: 'star',
    rarity: 'special',
    accentTone: 'reward',
    unlockLabel: '7 consecutive days of craft focus—remarkable dedication',
    profileFeaturedEligible: true,
    publicDisplayEligible: false,
  },

  'consistency-star': {
    id: 'consistency-star',
    title: 'Consistency Star',
    shortTitle: 'Consistent',
    description: 'Complete 5 out of 7 days this week',
    category: 'consistency',
    visibility: 'private',
    motif: 'star',
    emoji: '⭐',
    iconName: 'star',
    rarity: 'meaningful',
    accentTone: 'brand-secondary',
    unlockLabel: '5 days out of 7 completed—you are building rhythm',
    profileFeaturedEligible: true,
    publicDisplayEligible: false,
  },

  // CHALLENGE ACHIEVEMENTS (Profile-visible progress)
  'challenge-starter': {
    id: 'challenge-starter',
    title: 'Challenge Starter',
    shortTitle: 'Starter',
    description: 'Join your first active challenge',
    category: 'challenge',
    visibility: 'profile',
    motif: 'spark',
    emoji: '🚀',
    iconName: 'rocket',
    rarity: 'common',
    accentTone: 'brand-primary',
    unlockLabel: 'You picked your first craft challenge',
    profileFeaturedEligible: true,
    publicDisplayEligible: false,
  },

  'challenge-finisher': {
    id: 'challenge-finisher',
    title: 'Challenge Finisher',
    shortTitle: 'Finisher',
    description: 'Complete and archive a challenge',
    category: 'challenge',
    visibility: 'profile',
    motif: 'ribbon',
    emoji: '✨',
    iconName: 'ribbon',
    rarity: 'meaningful',
    accentTone: 'reward',
    unlockLabel: 'You completed a full craft challenge—beautiful work',
    profileFeaturedEligible: true,
    publicDisplayEligible: false,
  },

  'momentum-maker': {
    id: 'momentum-maker',
    title: 'Momentum Maker',
    shortTitle: 'Momentum',
    description: 'Have an active habit and challenge going',
    category: 'challenge',
    visibility: 'profile',
    motif: 'spark',
    emoji: '💫',
    iconName: 'spark',
    rarity: 'meaningful',
    accentTone: 'accent',
    unlockLabel: 'You are balancing habits and challenges with ease',
    profileFeaturedEligible: true,
    publicDisplayEligible: false,
  },

  // COMMUNITY ACHIEVEMENTS (Public-eligible milestones)
  'community-spark': {
    id: 'community-spark',
    title: 'Community Spark',
    shortTitle: 'Spark',
    description: 'Share your first public check-in',
    category: 'community',
    visibility: 'public',
    motif: 'spark',
    emoji: '✨',
    iconName: 'spark',
    rarity: 'common',
    accentTone: 'brand-primary',
    unlockLabel: 'You shared your first craft moment with the community',
    profileFeaturedEligible: true,
    publicDisplayEligible: true,
  },

  'chatty-crafter': {
    id: 'chatty-crafter',
    title: 'Chatty Crafter',
    shortTitle: 'Chatty',
    description: 'Share 3 public check-ins',
    category: 'community',
    visibility: 'public',
    motif: 'chat',
    emoji: '💬',
    iconName: 'chat',
    rarity: 'meaningful',
    accentTone: 'brand-secondary',
    unlockLabel: '3 shared moments—you are an active community member',
    profileFeaturedEligible: true,
    publicDisplayEligible: true,
  },
};

/**
 * Get a single badge catalog entry by ID
 * Returns undefined if badge ID not found
 */
export function getBadgeCatalogEntry(
  badgeId: string
): BadgeCatalogEntry | undefined {
  return BADGE_CATALOG[badgeId];
}

/**
 * Get all badge IDs in catalog
 */
export function getAllBadgeIds(): string[] {
  return Object.keys(BADGE_CATALOG);
}

/**
 * Get all badges matching a filter criteria
 */
export function filterBadges(
  predicate: (badge: BadgeCatalogEntry) => boolean
): BadgeCatalogEntry[] {
  return Object.values(BADGE_CATALOG).filter(predicate);
}

/**
 * Get badges by rarity
 */
export function getBadgesByRarity(rarity: Rarity): BadgeCatalogEntry[] {
  return filterBadges((badge) => badge.rarity === rarity);
}

/**
 * Get badges by category
 */
export function getBadgesByCategory(
  category: 'habit' | 'challenge' | 'community' | 'consistency'
): BadgeCatalogEntry[] {
  return filterBadges((badge) => badge.category === category);
}

/**
 * Get badges eligible for profile featured display
 */
export function getProfileFeaturableBadges(): BadgeCatalogEntry[] {
  return filterBadges((badge) => badge.profileFeaturedEligible);
}

/**
 * Get badges eligible for public display (e.g., username badges)
 */
export function getPublicDisplayableBadges(): BadgeCatalogEntry[] {
  return filterBadges((badge) => badge.publicDisplayEligible);
}

/**
 * Get CSS variable color name for accent tone
 * Connects to globals.css theme
 */
export function getAccentToneCssVariable(tone: AccentTone): string {
  const mapping: Record<AccentTone, string> = {
    'brand-primary': 'var(--color-brand-primary)',
    'brand-secondary': 'var(--color-brand-secondary)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    danger: 'var(--color-danger)',
    reward: 'var(--color-reward-primary)',
    accent: 'var(--color-brand-accent)',
  };
  return mapping[tone];
}

/**
 * Get rarity display properties for subtle visual differentiation
 * Used by UI to apply appropriate styling without being overwhelming
 */
export function getRarityProperties(rarity: Rarity): {
  opacityModifier: number;
  scaleModifier: number;
  shadowEmphasis: 'subtle' | 'normal' | 'prominent';
} {
  const properties = {
    common: {
      opacityModifier: 0.8,
      scaleModifier: 1,
      shadowEmphasis: 'subtle' as const,
    },
    meaningful: {
      opacityModifier: 0.95,
      scaleModifier: 1.05,
      shadowEmphasis: 'normal' as const,
    },
    milestone: {
      opacityModifier: 1,
      scaleModifier: 1.1,
      shadowEmphasis: 'prominent' as const,
    },
    special: {
      opacityModifier: 1,
      scaleModifier: 1.15,
      shadowEmphasis: 'prominent' as const,
    },
  };
  return properties[rarity];
}

/**
 * Get the Lucide React icon name for a given iconName
 * Maps badgeCatalog iconName to Lucide icon component name
 */
export function getLucideIconName(iconName: string): string {
  const map: Record<string, string> = {
    fire: 'Flame',
    star: 'Star',
    rocket: 'Rocket',
    ribbon: 'Ribbon',
    spark: 'Sparkles',
    chat: 'MessageCircle',
  };
  return map[iconName] || 'Star';
}
