/**
 * Phase 2.4: BadgeShell was only used by the retired BadgeDisplay component.
 * Kept as a minimal pass-through container so any future references compile.
 */

import { ReactNode } from 'react';

interface BadgeShellProps {
  children: ReactNode;
  className?: string;
}

export default function BadgeShell({ children, className = '' }: BadgeShellProps) {
  return <div className={className}>{children}</div>;
}
