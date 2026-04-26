import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
