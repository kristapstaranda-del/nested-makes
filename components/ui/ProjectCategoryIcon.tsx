/**
 * ProjectCategoryIcon
 *
 * Renders a soft, rounded SVG icon for a given craft category.
 * Replaces the emoji-based fallback that was fragile on older devices
 * (some Unicode 13+ glyphs do not render on Android <11 / iOS <14.2).
 *
 * Usage:
 *   <ProjectCategoryIcon category="Knitting" />
 *   <ProjectCategoryIcon category="Pottery" size="lg" />
 */

type Size = 'sm' | 'md' | 'lg';

interface ProjectCategoryIconProps {
  category: string;
  size?: Size;
  className?: string;
}

const sizeConfig: Record<Size, { wrapper: string; iconSize: number }> = {
  sm: { wrapper: 'w-9 h-9 rounded-xl',  iconSize: 18 },
  md: { wrapper: 'w-12 h-12 rounded-xl', iconSize: 24 },
  lg: { wrapper: 'w-16 h-16 rounded-2xl', iconSize: 36 },
};

// Each function returns the inner SVG children rendered into a
// 24×24 viewBox with strokeWidth 1.5, round caps/joins.
const ICONS: Record<string, () => React.ReactElement> = {

  Knitting: () => (
    <>
      {/* Yarn ball */}
      <circle cx="12" cy="14" r="6" />
      {/* Yarn texture lines */}
      <path d="M9 10.5 Q10 13 9 17" />
      <path d="M12 8 Q14 11 13.5 17" />
      {/* Left needle */}
      <line x1="8" y1="3" x2="14" y2="14" />
      <circle cx="8" cy="3" r="1.5" fill="currentColor" />
      {/* Right needle */}
      <line x1="16" y1="3" x2="10" y2="14" />
      <circle cx="16" cy="3" r="1.5" fill="currentColor" />
    </>
  ),

  Crochet: () => (
    // J-hook shape
    <path d="M12 2 L12 16 Q12 21 8 21 Q4 21 4 18 Q4 15 8 15" />
  ),

  Beading: () => (
    <>
      {/* Three beads */}
      <circle cx="12" cy="5"  r="2.5" />
      <circle cx="5.5" cy="17" r="2.5" />
      <circle cx="18.5" cy="17" r="2.5" />
      {/* String lines */}
      <path d="M12 7.5 L5.5 14.5 M12 7.5 L18.5 14.5" />
      {/* Bottom chain */}
      <path d="M3 17 L21 17" />
    </>
  ),

  Weaving: () => (
    <>
      {/* Frame */}
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      {/* Weft (horizontal) */}
      <line x1="4" y1="10" x2="20" y2="10" />
      <line x1="4" y1="16" x2="20" y2="16" />
      {/* Warp (vertical) */}
      <line x1="10" y1="4" x2="10" y2="20" />
      <line x1="16" y1="4" x2="16" y2="20" />
    </>
  ),

  Embroidery: () => (
    <>
      {/* Outer hoop ring */}
      <circle cx="12" cy="12" r="8" />
      {/* Inner hoop ring (fabric edge) */}
      <circle cx="12" cy="12" r="5.5" />
      {/* Cross stitch */}
      <path d="M9.5 9.5 L14.5 14.5 M14.5 9.5 L9.5 14.5" />
    </>
  ),

  Sewing: () => (
    <>
      {/* Scissor handles */}
      <circle cx="6" cy="7"  r="2.5" />
      <circle cx="6" cy="17" r="2.5" />
      {/* Blades */}
      <line x1="8.5" y1="7.5"  x2="21" y2="17" />
      <line x1="8.5" y1="16.5" x2="21" y2="7" />
    </>
  ),

  Pottery: () => (
    // Symmetric vase / amphora outline
    <path d="M9 21 C6 17 5.5 10 7 8 Q9.5 4 12 4 Q14.5 4 17 8 C18.5 10 18 17 15 21 Z" />
  ),

  Painting: () => (
    <>
      {/* Handle */}
      <line x1="5" y1="21" x2="18" y2="8" />
      {/* Bristle end (circle) */}
      <circle cx="20" cy="6" r="2.5" />
    </>
  ),

  'DIY Crafts': () => (
    <>
      {/* Hammer handle */}
      <line x1="9" y1="20" x2="14" y2="15" />
      {/* Hammer head */}
      <path d="M11.5 12.5 L16 8 L18.5 10.5 L14 15 Z" />
    </>
  ),
};

// Generic fallback — a 4-pointed star (craft-neutral, universally legible)
function FallbackIcon(): React.ReactElement {
  return (
    <path d="M12 3 L13.8 9.2 L20 12 L13.8 14.8 L12 21 L10.2 14.8 L4 12 L10.2 9.2 Z" />
  );
}

export default function ProjectCategoryIcon({
  category,
  size = 'md',
  className = '',
}: ProjectCategoryIconProps) {
  const { wrapper, iconSize } = sizeConfig[size];
  const Icon = ICONS[category] ?? FallbackIcon;

  return (
    <div
      className={`${wrapper} shrink-0 flex items-center justify-center bg-[var(--color-bg-soft)] ${className}`}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-[var(--color-text-secondary)]"
        aria-hidden="true"
      >
        <Icon />
      </svg>
    </div>
  );
}
