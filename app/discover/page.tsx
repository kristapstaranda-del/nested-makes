'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { projects } from '@/app/data/projects';
import { getUserProjects, normalizeUserProject, type DiscoverProject } from '@/lib/userProjects';
import { getProjectSignals, type ProjectSignalsMap } from '@/lib/projectSignals';
import ProjectCard from '@/components/ui/ProjectCard';
import SectionHeader from '@/components/ui/SectionHeader';
import EmptyState from '@/components/ui/EmptyState';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';

// Static curated projects already match DiscoverProject shape (minus isUserProject)
const curatedProjects: DiscoverProject[] = projects;

// Canonical curated category list — order and spelling are intentional.
// User-created categories may be appended after this list (see useEffect below).
const CURATED_CATEGORIES = [
  'Knitting', 'Crochet', 'Beading', 'Weaving', 'Embroidery',
  'Sewing', 'Pottery', 'Painting', 'DIY Crafts',
];

// Title-cases a raw category string from user input.
// Returns '' for empty / oversized strings to keep the filter list clean.
function normalizeCategory(raw: string): string {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed || trimmed.length > 30) return '';
  return trimmed
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function DiscoverPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [sortMode, setSortMode] = useState('All');
  const [signals, setSignals] = useState<ProjectSignalsMap>({});
  const [allProjects, setAllProjects] = useState<DiscoverProject[]>(curatedProjects);
  // Start with only curated categories; user categories are appended after hydration.
  const [categories, setCategories] = useState<string[]>(['All', ...CURATED_CATEGORIES]);

  useEffect(() => {
    setSignals(getProjectSignals());
    const userProjects = getUserProjects().map(normalizeUserProject);
    // User projects appear at the top so they're immediately visible
    setAllProjects([...userProjects, ...curatedProjects]);

    // Augment the category list with any valid categories from user projects
    // that aren't already covered by the curated list.
    const curatedSet = new Set(CURATED_CATEGORIES.map(c => c.toLowerCase()));
    const extras = new Set<string>();
    userProjects.forEach(p => {
      const normalized = normalizeCategory(p.craftType);
      if (normalized && !curatedSet.has(normalized.toLowerCase())) {
        extras.add(normalized);
      }
    });
    if (extras.size > 0) {
      setCategories(['All', ...CURATED_CATEGORIES, ...[...extras].sort()]);
    }
  }, []);

  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];
  const sortModes = ['All', 'Popular', 'Most Active', 'Completed'];

  // Case-insensitive category match so that user-created projects with
  // slightly different casing ("knitting" vs "Knitting") still filter correctly.
  const afterCategory = allProjects.filter(p =>
    selectedCategory === 'All' ||
    p.craftType.toLowerCase() === selectedCategory.toLowerCase()
  );

  const afterDifficulty = afterCategory.filter(p =>
    selectedDifficulty === 'All' || p.difficulty === selectedDifficulty
  );

  const sortedProjects = [...afterDifficulty].sort((a, b) => {
    const sa = signals[a.id] ?? { makersCount: 0, finishedCount: 0, discussionCount: 0 };
    const sb = signals[b.id] ?? { makersCount: 0, finishedCount: 0, discussionCount: 0 };
    switch (sortMode) {
      case 'Popular':     return sb.makersCount    - sa.makersCount;
      case 'Most Active': return sb.discussionCount - sa.discussionCount;
      case 'Completed':   return sb.finishedCount  - sa.finishedCount;
      default: return 0;
    }
  });

  function clearFilters() {
    setSelectedCategory('All');
    setSelectedDifficulty('All');
    setSortMode('All');
  }

  // Sort mode affects ordering but not what's shown, so it doesn't count as a filter.
  const activeFilterCount =
    (selectedCategory !== 'All' ? 1 : 0) +
    (selectedDifficulty !== 'All' ? 1 : 0);

  // Used to decide between "clear filters" vs "add project" CTA in the empty state.
  const isFiltered = activeFilterCount > 0;

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
        <SectionHeader
          title="Discover Projects"
          subtitle="Pick a project and make a little progress today."
          trailing={
            <Link href="/projects/add">
              <Button variant="secondary" size="sm">+ Add yours</Button>
            </Link>
          }
        />

        {/* Filter area — three stacked rows keep each filter scannable on mobile */}
        <div className="mt-5 space-y-4">

          {/* Craft */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Craft</p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="focus:outline-none"
                >
                  <Chip label={cat} variant={selectedCategory === cat ? 'primary' : 'neutral'} />
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Difficulty</p>
            <div className="flex flex-wrap gap-1.5">
              {difficulties.map(level => (
                <button
                  key={level}
                  onClick={() => setSelectedDifficulty(level)}
                  className="focus:outline-none"
                >
                  <Chip label={level} variant={selectedDifficulty === level ? 'primary' : 'neutral'} />
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Sort by</p>
            <div className="flex flex-wrap gap-1.5">
              {sortModes.map(mode => (
                <button
                  key={mode}
                  onClick={() => setSortMode(mode)}
                  className="focus:outline-none"
                >
                  <Chip label={mode} variant={sortMode === mode ? 'primary' : 'neutral'} />
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Visual break between filters and results */}
        <div className="mt-6 border-t border-[var(--color-border-subtle)]" />

        {/* Results header: count + active filter summary */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-sm text-[var(--color-text-muted)]">
            {sortedProjects.length} {sortedProjects.length === 1 ? 'project' : 'projects'}
          </p>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} active · Clear all
            </button>
          )}
        </div>

        {/* Projects list */}
        <div className="mt-3 grid gap-4">
          {sortedProjects.length === 0 ? (
            <EmptyState
              title="Nothing found here"
              description={
                isFiltered
                  ? "No projects match these filters. Try a broader selection, or add one of your own."
                  : "No projects to browse yet. Add one to get started."
              }
              action={
                isFiltered ? (
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Link href="/projects/add">
                    <Button variant="primary" size="sm">Add a project</Button>
                  </Link>
                )
              }
            />
          ) : (
            <>
              {sortedProjects.map((project, idx) => {
                const sig = signals[project.id];
                // In default sort order, user projects always appear first.
                // Show a soft "From the library" divider at the transition point
                // so the two groups are gently distinguished without loud badges.
                const showLibraryDivider =
                  sortMode === 'All' &&
                  !project.isUserProject &&
                  idx > 0 &&
                  sortedProjects[idx - 1].isUserProject;
                return (
                  <React.Fragment key={project.id}>
                    {showLibraryDivider && (
                      <div className="flex items-center gap-3 py-1">
                        <div className="h-px flex-1 bg-[var(--color-border-subtle)]" />
                        <span className="text-xs text-[var(--color-text-muted)]">From the library</span>
                        <div className="h-px flex-1 bg-[var(--color-border-subtle)]" />
                      </div>
                    )}
                    <ProjectCard
                      id={project.id}
                      title={project.title}
                      craftType={project.craftType}
                      difficulty={project.difficulty}
                      description={project.description}
                      makersCount={sig?.makersCount}
                      finishedCount={sig?.finishedCount}
                      isUserProject={project.isUserProject}
                      coverImage={project.coverImage}
                    />
                  </React.Fragment>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
