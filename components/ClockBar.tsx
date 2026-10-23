import { formatClock } from "@/lib/timing";

type Props = {
  used: number;
  limit: number;
  /** A required length named in the rubric, in minutes, if one was found. */
  statedMinutes?: number | null;
};

export default function ClockBar({ used, limit, statedMinutes = null }: Props) {
  const over = used > limit;
  const percent = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const statedSeconds =
    statedMinutes != null ? Math.round(statedMinutes * 60) : null;
  const mismatch = statedSeconds != null && statedSeconds !== limit;

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[12px] text-muted">Running time</span>
        <span
          className={`text-[13px] tabular-nums ${
            over ? "text-flag" : "text-ink"
          }`}
        >
          {formatClock(used)} / {formatClock(limit)}
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
          You are {formatClock(used - limit)} over. Cut something.
        </p>
      ) : null}
      {mismatch ? (
        <p className="mt-2 text-[12px] leading-relaxed text-muted">
          Your rubric names {formatClock(statedSeconds)}. The clock stays at{" "}
          {formatClock(limit)} — change the length above if you want to match it.
        </p>
      ) : null}
    </div>
  );
}
