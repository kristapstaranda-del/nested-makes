'use client';

/**
 * Phase 2.4: BadgeDisplay was retired alongside the achievements module.
 * Component is stubbed to a noop so any straggler imports compile. Will be
 * rebuilt as part of the dedicated badges feature.
 */

import type { Achievement } from '@/lib/achievements';

interface BadgeDisplayProps {
  achievement: Achievement;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export default function BadgeDisplay(_props: BadgeDisplayProps) {
  return null;
}
