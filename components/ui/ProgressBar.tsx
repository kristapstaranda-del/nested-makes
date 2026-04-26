interface ProgressBarProps {
  value: number; // 0..1
  label?: string;
  className?: string;
}

export default function ProgressBar({ value, label, className = '' }: ProgressBarProps) {
  const normalized = Math.max(0, Math.min(1, value));
  const percent = Math.round(normalized * 100);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between text-xs font-medium text-[var(--color-text-secondary)]">
          <span>{label}</span>
          <span>{percent}%</span>
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-soft)]">
        <div
          className="h-full rounded-full bg-[var(--color-brand-primary)] transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
