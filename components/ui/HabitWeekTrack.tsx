interface HabitDayStatus {
  date: string;
  status: 'done' | 'missed' | 'empty';
}

interface HabitWeekTrackProps {
  days: HabitDayStatus[];
  target: number;
  completed: number;
}

/**
 * HabitWeekTrack
 * Segmented 7-day streak track for the private habit section.
 * Replaces the plain ProgressBar + separate "Recent days" chip row with a single
 * compact visual that communicates both the weekly count and the per-day status.
 *
 * Visual language:
 *  done    — brand-primary fill (sage green, warm)
 *  missed  — bg-soft fill (muted warm beige, quiet)
 *  today   — brand-primary-soft + subtle border (not yet logged, gently highlighted)
 *  future  — bg-elevated + border-subtle (placeholder, recedes into background)
 *
 * The 4px gaps between segments give the row a "counted" craft quality —
 * like stitches or tally marks — without adding explicit illustration.
 */
export default function HabitWeekTrack({ days, target, completed }: HabitWeekTrackProps) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-2">
      {/* Header: label + count summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">Weekly momentum</p>
        <p className="text-xs font-medium text-[var(--color-text-secondary)]">
          {completed} / {target} days
        </p>
      </div>

      {/* Segmented day track */}
      <div className="flex gap-1" role="list" aria-label="Habit week progress">
        {days.map((day) => {
          const isToday = day.date === today;
          // First 2 characters of the short weekday name — "Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"
          const label = new Date(day.date)
            .toLocaleDateString(undefined, { weekday: 'short' })
            .slice(0, 2);

          return (
            <div
              key={day.date}
              role="listitem"
              aria-label={`${new Date(day.date).toLocaleDateString(undefined, { weekday: 'long' })}: ${day.status}`}
              title={day.date}
              className={`flex-1 rounded-md py-2.5 flex items-center justify-center text-[10px] font-semibold transition-colors ${
                day.status === 'done'
                  ? 'bg-[var(--color-brand-primary)] text-[var(--color-text-on-dark)]'
                  : day.status === 'missed'
                  ? 'bg-[var(--color-bg-soft)] text-[var(--color-text-muted)]'
                  : isToday
                  ? 'bg-[var(--color-brand-primary-soft)] border border-[var(--color-brand-primary)]/25 text-[var(--color-brand-primary)]'
                  : 'bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)]'
              }`}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
