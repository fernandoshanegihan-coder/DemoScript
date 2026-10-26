/**
 * One bar for every wait. Pass a 0–1 value when the app can actually measure
 * what is happening; leave it out when it cannot, and the bar slides instead of
 * pretending to know how far along the work is.
 */
export default function ProgressBar({
  value = null,
  label = null,
  hint = null,
  className = "",
}: {
  value?: number | null;
  label?: string | null;
  hint?: string | null;
  className?: string;
}) {
  const measured = typeof value === "number" && Number.isFinite(value);
  const percent = measured ? Math.min(100, Math.max(0, Math.round((value as number) * 100))) : null;

  return (
    <div
      className={className}
      role="progressbar"
      aria-label={label ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent ?? undefined}
      aria-busy={percent === null || undefined}
    >
      {label || percent !== null ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-4">
          <span className="min-w-0 truncate text-[11.5px] text-muted">{label}</span>
          {percent !== null ? (
            <span className="shrink-0 text-[11px] tabular-nums text-faint">{percent}%</span>
          ) : null}
        </div>
      ) : null}
      <div className="h-[3px] w-full overflow-hidden bg-paper-sunk">
        {percent !== null ? (
          <div
            className="h-full bg-accent transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        ) : (
          <div className="progress-indeterminate h-full w-1/3 bg-accent" />
        )}
      </div>
      {hint ? <p className="mt-1.5 text-[11px] tabular-nums text-faint">{hint}</p> : null}
    </div>
  );
}
