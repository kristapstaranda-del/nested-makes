interface ProfileInterestsProps {
  craftInterests: string[];
}

export default function ProfileInterests({ craftInterests }: ProfileInterestsProps) {
  return (
    <div className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">Craft interests</h3>
      <p className="text-sm text-[var(--color-text-secondary)] mb-3">Your craft interests</p>
      {craftInterests.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {craftInterests.map((interest, index) => (
            <span
              key={index}
              className="rounded-full bg-[var(--color-brand-primary-soft)] px-3 py-1 text-sm font-medium text-[var(--color-brand-primary)]"
            >
              {interest}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)] italic">Add your favorite crafts to connect with others</p>
      )}
    </div>
  );
}
