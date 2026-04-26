import { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  className?: string;
}

export default function SectionHeader({ title, subtitle, trailing, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>}
      </div>
      {trailing && <div className="mt-1">{trailing}</div>}
    </div>
  );
}
