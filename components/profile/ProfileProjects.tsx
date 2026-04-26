'use client';

import Link from 'next/link';
import { type UserProject } from '@/lib/userProjects';
import ProjectCategoryIcon from '@/components/ui/ProjectCategoryIcon';

interface Props {
  userProjects: UserProject[];
}

export default function ProfileProjects({ userProjects }: Props) {
  const count = userProjects.length;

  // Most recently created first, show up to 2 as previews
  const recent = [...userProjects]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 2);

  return (
    <div className="rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Your projects</h2>
        {count > 0 && (
          <span className="text-xs font-medium text-[var(--color-text-muted)]">
            {count} {count === 1 ? 'project' : 'projects'}
          </span>
        )}
      </div>
      {count === 0 ? (
        <div className="mt-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            You haven't added any projects yet. Start by adding something you're working on.
          </p>
          <Link
            href="/projects/add"
            className="mt-3 inline-block text-sm font-medium text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)] underline"
          >
            Add your first project
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-4">
            {recent.map((p, idx) => {
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className={`flex items-center gap-3 py-3 hover:opacity-70 transition-opacity ${idx < recent.length - 1 ? 'border-b border-[var(--color-border-subtle)]' : ''}`}
                >
                  <ProjectCategoryIcon category={p.category} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{p.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{p.category}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          <Link
            href="/projects/my"
            className="mt-4 inline-block text-sm font-medium text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)] underline"
          >
            View all my projects →
          </Link>
        </>
      )}
    </div>
  );
}
