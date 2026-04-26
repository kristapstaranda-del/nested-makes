import { ReactNode } from 'react';

interface BadgeShellProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'reward';
}

const background: Record<NonNullable<BadgeShellProps['variant']>, string> = {
  default: 'bg-[var(--color-bg-soft)] border border-[var(--color-border-subtle)]',
  primary: 'bg-[var(--color-brand-primary-soft)] border border-[var(--color-brand-primary)]',
  reward: 'bg-[var(--color-reward-soft)] border border-[var(--color-reward-primary)]',
};

export default function BadgeShell({ children, className = '', variant = 'default' }: BadgeShellProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${background[variant]} text-[var(--color-text-primary)] ${className}`}
    >
      {children}
    </div>
  );
}
