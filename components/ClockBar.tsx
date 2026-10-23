import { formatClock } from "@/lib/timing";

type Props = {
  used: number;
  limit: number;
};

export default function ClockBar({ used, limit }: Props) {
  const over = used > limit;
  const percent = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));

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
    </div>
  );
}
