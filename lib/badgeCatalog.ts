/**
 * lib/badgeCatalog.ts
 *
 * Phase 2.4: retired alongside the achievements module. Stubbed to keep any
 * lingering imports compiling. Safe to delete once unreferenced.
 */

export interface BadgeCatalogEntry {
  id: string;
  rarity: 'common' | 'meaningful' | 'milestone' | 'special';
  unlockLabel?: string;
  iconName?: string;
}

export function getBadgeCatalogEntry(_id: string): BadgeCatalogEntry | null {
  return null;
}

export function getLucideIconName(name: string): string {
  return name;
}
