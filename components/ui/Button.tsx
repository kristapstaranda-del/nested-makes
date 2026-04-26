import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas disabled:cursor-not-allowed disabled:opacity-70';

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-4 py-2.5 text-sm',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-brand-primary)] text-[var(--color-text-on-dark)] hover:bg-[var(--color-brand-primary-hover)]',
  secondary:
    'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-soft)]',
  ghost:
    'bg-transparent text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-soft)]',
  destructive:
    'bg-[var(--color-danger)] text-[var(--color-text-on-dark)] hover:bg-[#9a4c59]',
};

export default function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button className={`${base} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
