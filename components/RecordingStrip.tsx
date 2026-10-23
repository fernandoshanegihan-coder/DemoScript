"use client";

import { formatClock } from "@/lib/timing";

type Props = {
  posterDataUrl: string;
  durationSeconds: number;
  limitSeconds: number;
  recording: boolean;
  paused: boolean;
  starting: boolean;
  elapsedSeconds: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRemove: () => void;
  onRecordAgain: () => void;
};

export default function RecordingStrip({
  posterDataUrl,
  durationSeconds,
  limitSeconds,
  recording,
  paused,
  starting,
  elapsedSeconds,
  onPause,
  onResume,
  onStop,
  onRemove,
  onRecordAgain,
}: Props) {
  if (starting) {
    return (
      <div className="py-2">
        <p className="text-[13.5px] text-ink">Waiting for you to pick a screen…</p>
        <p className="mt-1.5 text-[12px] text-muted">
          Choose the window with your project. Recording starts once you do — a
          floating bar stays on top so you can pause without switching back.
        </p>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="py-1">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              paused ? "bg-faint" : "animate-pulse bg-flag"
            }`}
            aria-hidden
          />
          <p className="text-[13.5px] tabular-nums text-ink">
            {paused ? "Paused at " : "Recording "}
            {formatClock(elapsedSeconds)} of {formatClock(limitSeconds)}
          </p>
        </div>
        <p className="mt-1.5 text-[12px] text-muted">
          {paused
            ? "Your clip won't include this stretch. Resume when you're ready."
            : "Picture only. Pause anytime — the gap is cut. It ends on its own at three minutes of footage."}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={paused ? onResume : onPause}
            className="bg-accent px-3 py-1.5 text-[12.5px] text-paper transition-opacity hover:opacity-90"
          >
            {paused ? "Resume recording" : "Pause recording"}
          </button>
          <button
            type="button"
            onClick={onStop}
            className="border border-ink px-3 py-1.5 text-[12.5px] text-ink hover:border-accent"
          >
            Stop recording
          </button>
        </div>
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
