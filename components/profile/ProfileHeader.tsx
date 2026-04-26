import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { getAvatarById } from '@/lib/avatarLibrary';

interface ProfileHeaderProps {
  name: string;
  about: string;
  avatarId?: string;
  statusText?: string;
  craftInterests?: string[];
  onEdit: () => void;
}

export default function ProfileHeader({
  name,
  about,
  avatarId,
  statusText,
  craftInterests,
  onEdit,
}: ProfileHeaderProps) {
  const initials = name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2) || 'A';

  const isProfileIncomplete = !name || name === 'Anonymous' || !about;
  const selectedAvatar = getAvatarById(avatarId);

  return (
    <Card>
      <div className="flex items-start gap-4">
        {/* Avatar - image or initials */}
        {selectedAvatar ? (
          <img
            src={selectedAvatar.imageSrc}
            alt={name}
            className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white bg-[var(--color-text-muted)]">
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
            {name || 'Welcome crafter!'}
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {about || (isProfileIncomplete ? 'Tell us about yourself and your crafts' : 'No bio yet')}
          </p>
          {statusText && (
            <p className="mt-1 text-xs font-medium text-[var(--color-text-secondary)]">
              {statusText}
            </p>
          )}
        </div>
        <Button onClick={onEdit} variant="secondary" size="sm" className="flex-shrink-0">
          {isProfileIncomplete ? 'Set Up' : 'Edit'}
        </Button>
      </div>
      {craftInterests && craftInterests.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {craftInterests.map((interest, i) => (
            <span
              key={i}
              className="rounded-full bg-[var(--color-brand-primary-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-brand-primary)]"
            >
              {interest}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}