import { ReactNode } from 'react';

type ChipVariant = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'reward';

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  className?: string;
}

const chipStyles: Record<ChipVariant, string> = {
  neutral: 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)]',
  primary: 'bg-[var(--color-brand-primary-soft)] text-[var(--color-brand-primary)] border border-[var(--color-brand-primary)]',
  secondary: 'bg-[var(--color-brand-secondary-soft)] text-[var(--color-brand-secondary)] border border-[var(--color-brand-secondary)]',
  success: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
  reward: 'bg-[var(--color-reward-soft)] text-[var(--color-reward-primary)]',
};

export default function Chip({ label, variant = 'neutral', className = '' }: ChipProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium ${chipStyles[variant]} ${className}`}>
      {label}
    </span>
  );
}
