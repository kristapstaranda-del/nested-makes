'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getPublicProfile, type PublicProfile, type PublicProjectPreview } from '@/lib/communityProfiles';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import ProjectCategoryIcon from '@/components/ui/ProjectCategoryIcon';

export default function CommunityProjectDetailPage() {
  const params = useParams();
  const profileId = typeof params.id === 'string' ? params.id : '';
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';

  const [profile, setProfile] = useState<PublicProfile | null | 'loading'>('loading');
  const [project, setProject] = useState<PublicProjectPreview | null | 'loading'>('loading');

  useEffect(() => {
    const found = getPublicProfile(profileId);
    setProfile(found);
    setProject(found?.finishedProjects.find((p) => p.id === projectId) ?? null);
  }, [profileId, projectId]);

  if (profile === 'loading' || project === 'loading') {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24" />
      </div>
    );
  }

  const profileName = profile?.displayName ?? 'profile';

  const backLink = (
    <Link
      href={`/community/${profileId}`}
      className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)]"
    >
      ← Back to {profileName}'s profile
    </Link>
  );

  if (!project) {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
          {backLink}
          <Card>
            <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
              This project isn't available.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24 space-y-5">
        {backLink}

        <Card className="overflow-hidden p-0">
          {project.coverImage && (
            <div className="w-full h-48 bg-[var(--color-bg-soft)]">
              <img
                src={project.coverImage}
                alt={project.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex-none mt-0.5">
                <ProjectCategoryIcon category={project.category} size="lg" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold text-[var(--color-text-primary)] leading-snug">
                  {project.title}
                </h1>
                <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
                  {project.category}
                </p>
                <div className="mt-2">
                  <Chip label="Finished project" variant="success" />
                </div>
              </div>
            </div>

            {project.description && (
              <>
                <div className="mt-5 border-t border-[var(--color-border-subtle)]" />
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                    About this project
                  </p>
                  <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                    {project.description}
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
