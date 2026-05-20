'use client';

/**
 * Phase 2.4: this nested community-project detail page was only reachable
 * through the (now removed) mock profile finishedProjects array. It has no
 * inbound links in the current app. Kept as a minimal redirect-style stub so
 * any old bookmarks still land somewhere sensible — the canonical project
 * detail page is /projects/[projectId].
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import Card from '@/components/ui/Card';

export default function CommunityProjectDetailPage() {
  const params = useParams();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
        <Card>
          <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
            This project view has moved.
          </p>
          {projectId && (
            <div className="text-center">
              <Link
                href={`/projects/${projectId}`}
                className="text-sm font-medium text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)]"
              >
                Open project →
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
