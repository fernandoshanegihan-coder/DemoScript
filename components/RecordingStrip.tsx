"use client";

import { formatClock } from "@/lib/timing";

type Props = {
  posterDataUrl: string;
  durationSeconds: number;
  limitSeconds: number;
  recording: boolean;
  starting: boolean;
  elapsedSeconds: number;
  onStop: () => void;
  onRemove: () => void;
  onRecordAgain: () => void;
};

export default function RecordingStrip({
  posterDataUrl,
  durationSeconds,
  limitSeconds,
  recording,
  starting,
  elapsedSeconds,
  onStop,
  onRemove,
  onRecordAgain,
}: Props) {
  if (starting) {
    return (
      <div className="py-2">
        <p className="text-[13.5px] text-ink">Waiting for you to pick a screen…</p>
        <p className="mt-1.5 text-[12px] text-muted">
          Choose the window or tab with your project. Recording starts once you do.
        </p>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="py-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-flag" aria-hidden />
          <p className="text-[13.5px] tabular-nums text-ink">
            Recording {formatClock(elapsedSeconds)} of {formatClock(limitSeconds)}
          </p>
        </div>
        <p className="mt-1.5 text-[12px] text-muted">
          Picture only. Click through your project, then stop — it ends on its own at
          three minutes.
        </p>
        <button
          type="button"
          onClick={onStop}
          className="mt-3 border border-ink px-3 py-1.5 text-[12.5px] text-ink hover:border-accent"
        >
          Stop recording
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[96px_1fr] gap-3 py-1">
      {posterDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={posterDataUrl}
          alt="The first moments of your recording"
          className="h-[62px] w-[96px] border border-hairline object-cover"
        />
      ) : (
        <div className="h-[62px] w-[96px] border border-hairline bg-paper-sunk" />
      )}
      <div className="min-w-0">
        <p className="text-[13.5px] tabular-nums text-ink">
          {formatClock(durationSeconds)} recorded
        </p>
        <p className="mt-0.5 text-[12px] text-muted">
          One clip, picture only. Scenes will be pinned to its moments.
        </p>
        <div className="mt-2 flex items-center gap-4 text-[11.5px]">
          <button
            type="button"
            onClick={onRecordAgain}
            className="text-accent underline decoration-hairline underline-offset-2 hover:decoration-accent"
          >
            Record again
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-faint hover:text-ink"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
