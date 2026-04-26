'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUserProjects, deleteUserProject, type UserProject } from '@/lib/userProjects';
import ProjectCategoryIcon from '@/components/ui/ProjectCategoryIcon';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import EmptyState from '@/components/ui/EmptyState';

const difficultyVariant = (difficulty: string) => {
  switch (difficulty.toLowerCase()) {
    case 'beginner':    return 'success';
    case 'intermediate': return 'primary';
    case 'advanced':    return 'warning';
    default:            return 'neutral';
  }
};

export default function MyProjectsPage() {
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loaded = getUserProjects().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setProjects(loaded);
    setLoading(false);
  }, []);

  function handleDelete(project: UserProject) {
    // Block deletion if currently in an active challenge
    try {
      const raw = localStorage.getItem('activeChallenges');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.some((c) => c.projectId === project.id)) {
          alert(`"${project.title}" is part of an active challenge and can't be deleted right now. End the challenge first, then come back to delete it.`);
          return;
        }
      }
    } catch {}

    if (!window.confirm(`Delete "${project.title}"? This can't be undone.`)) return;
    deleteUserProject(project.id);
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
        <Link
          href="/profile"
          className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)]"
        >
          ← Back to profile
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">My Projects</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              The projects you&apos;ve added and shared here.
            </p>
          </div>
          <Link href="/projects/add">
            <Button variant="primary" size="sm">+ Add</Button>
          </Link>
        </div>

        <div className="mt-6">
          {projects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              description="Add a project you're working on — your pattern link and notes will always be here when you need them."
              action={
                <Link href="/projects/add">
                  <Button variant="primary">Add your first project</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-4">
              {projects.map((project) => {
                return (
                  <Card key={project.id}>
                    <div className="flex items-start gap-3">
                      <ProjectCategoryIcon category={project.category} size="sm" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/projects/${project.id}`}>
                          <h2 className="truncate text-base font-bold text-[var(--color-text-primary)] hover:text-[var(--color-brand-primary)] transition-colors">
                            {project.title}
                          </h2>
                        </Link>
                        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{project.category}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {project.difficulty && (
                            <Chip label={project.difficulty} variant={difficultyVariant(project.difficulty)} />
                          )}
                          {project.patternLink && (
                            <Chip label="Has pattern" variant="neutral" />
                          )}
                        </div>
                      </div>
                    </div>

                    {project.description && (
                      <p className="mt-3 text-sm text-[var(--color-text-secondary)] line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    <div className="mt-4 flex items-center gap-3 border-t border-[var(--color-border-subtle)] pt-3">
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-sm font-medium text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)]"
                      >
                        Open →
                      </Link>
                      <Link
                        href={`/projects/edit/${project.id}`}
                        className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(project)}
                        className="ml-auto text-sm font-medium text-[var(--color-danger)] hover:text-[var(--color-danger-hover,#a05560)]"
                      >
                        Delete
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
