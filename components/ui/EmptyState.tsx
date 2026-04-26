import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string | ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/**
 * Default craft motif — a dashed stitch ring, like an embroidery hoop edge.
 * Universal enough to work across all empty-state contexts (challenges, projects,
 * discover, habits). Rendered in brand-primary at low opacity so it reads as a
 * quiet warm accent, not a feature.
 */
function StitchRing() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-full w-full"
    >
      {/* Outer stitched ring */}
      <circle
        cx="24"
        cy="24"
        r="19"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="3.5 3"
        strokeLinecap="round"
        opacity="0.35"
      />
      {/* Inner stitched ring — slightly tighter, creates depth */}
      <circle
        cx="24"
        cy="24"
        r="13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="2.5 2.5"
        strokeLinecap="round"
        opacity="0.18"
      />
      {/* Center dot */}
      <circle
        cx="24"
        cy="24"
        r="3"
        fill="currentColor"
        opacity="0.22"
      />
    </svg>
  );
}

export default function EmptyState({
  title,
  description,
  action,
  icon,
  className = '',
}: EmptyStateProps) {
  // Use the provided icon if given, otherwise fall back to the default stitch-ring motif.
  // This keeps all existing call sites unchanged while giving every empty state
  // a subtle craft-aware visual accent.
  const motif = icon ?? <StitchRing />;

  return (
    <div
      className={`rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6 text-center ${className}`}
    >
      <div className="mx-auto max-w-sm">
        <div className="mx-auto mb-3 h-12 w-12 text-[var(--color-brand-primary)]">
          {motif}
        </div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}
