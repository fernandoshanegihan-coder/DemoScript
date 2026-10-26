import { formatClock } from "@/lib/timing";

type Props = {
  /** How long the script runs, in seconds. The script sets its own length. */
  used: number;
  /** A required length named in the rubric, in minutes, if one was found. */
  statedMinutes?: number | null;
};

export default function ClockBar({ used, statedMinutes = null }: Props) {
  const statedSeconds =
    statedMinutes != null ? Math.round(statedMinutes * 60) : null;
  const limit = statedSeconds ?? Math.max(1, used);
  const over = statedSeconds != null && used > statedSeconds;
  const percent = Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[12px] text-muted">Running time</span>
        <span className={`text-[13px] tabular-nums ${over ? "text-flag" : "text-ink"}`}>
          {formatClock(used)}
          {statedSeconds != null ? ` / ${formatClock(statedSeconds)}` : ""}
        </span>
      </div>
      <div className="h-px w-full bg-hairline">
        <div
          className={`h-px ${over ? "bg-flag" : "bg-accent"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {over ? (
        <p className="mt-2 text-[12px] text-flag">
          {formatClock(used - limit)} over the {formatClock(limit)} your rubric
          names. Cut something.
        </p>
      ) : null}
    </div>
  );
}
