import Link from 'next/link';

interface AuthorLinkProps {
  authorId?: string;
  displayName: string;
  className?: string;
}

/**
 * Renders a clickable author name linking to their public profile when
 * authorId is available, otherwise falls back to a plain span.
 */
export default function AuthorLink({ authorId, displayName, className }: AuthorLinkProps) {
  const base = className ?? 'text-xs font-semibold text-[var(--color-text-primary)]';

  if (authorId) {
    return (
      <Link
        href={`/community/${authorId}`}
        className={`${base} hover:text-[var(--color-brand-primary)] transition-colors`}
      >
        {displayName}
      </Link>
    );
  }

  return <span className={base}>{displayName}</span>;
}
