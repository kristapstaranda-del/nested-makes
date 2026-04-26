import Link from 'next/link';
import Card from './Card';
import Chip from './Chip';
import ProjectCategoryIcon from './ProjectCategoryIcon';

interface ProjectCardProps {
  id: string;
  title: string;
  craftType: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  description: string;
  makersCount?: number;
  finishedCount?: number;
  isUserProject?: boolean;
  coverImage?: string;
}

const difficultyVariant = (difficulty: string) => {
  switch (difficulty.toLowerCase()) {
    case 'beginner':
      return 'success';
    case 'intermediate':
      return 'primary';
    case 'advanced':
      return 'warning';
    default:
      return 'neutral';
  }
};

export default function ProjectCard({ id, title, craftType, difficulty, description, makersCount, finishedCount, isUserProject, coverImage }: ProjectCardProps) {
  return (
    <Link href={`/projects/${id}`} className="block group">
      <Card className="h-full border-2 border-transparent transition-all duration-200 hover:border-[var(--color-brand-primary)] hover:shadow-md overflow-hidden">
        {/* Cover image — bleeds to card edges when present */}
        {coverImage && (
          <div className="-mx-4 -mt-4 mb-5 aspect-[4/3] overflow-hidden bg-[var(--color-bg-soft)]">
            <img src={coverImage} alt={title} className="h-full w-full object-cover" loading="lazy" />
          </div>
        )}

        {/* Icon + title + category in a single row — mirrors the detail page header */}
        <div className="flex items-start gap-3">
          {!coverImage && <ProjectCategoryIcon category={craftType} size="md" />}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold leading-snug text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-primary)]">
              {title}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{craftType}</p>
          </div>
        </div>

        {/* Chips */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip label={difficulty} variant={difficultyVariant(difficulty)} />
          {isUserProject && <Chip label="Your project" variant="secondary" />}
        </div>

        <p className="mt-3 text-sm text-[var(--color-text-secondary)] line-clamp-2">
          {description}
        </p>

        {(!!makersCount || !!finishedCount) && (
          <p className="mt-2 text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
            {makersCount ? (
              <span>🧵 {makersCount} crafting now</span>
            ) : null}
            {makersCount && finishedCount ? <span aria-hidden="true">·</span> : null}
            {finishedCount ? (
              <span>{finishedCount} finished</span>
            ) : null}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between text-sm font-medium text-[var(--color-brand-primary)]">
          <span>View details</span>
          <span aria-hidden="true">→</span>
        </div>
      </Card>
    </Link>
  );
}
