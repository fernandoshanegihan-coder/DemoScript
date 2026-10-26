"use client";

import { useEffect, useState } from "react";

import { formatClock } from "@/lib/timing";
import { TAKE_STATUS_LABEL, WPM_MAX, WPM_MIN } from "@/lib/voiceRecorder";
import type { Scene, SceneTake } from "@/lib/types";
import { lineFitsScene } from "@/lib/sceneTimeline";

const CHIP: Record<SceneTake["status"], string> = {
  empty: "bg-faint",
  recorded: "bg-ok",
  "too-long": "bg-flag",
  "too-short": "bg-flag",
};

const quiet =
  "text-[11.5px] text-muted underline decoration-hairline underline-offset-2 hover:text-ink hover:decoration-accent";
const primary =
  "bg-accent px-3 py-1.5 text-[12px] text-paper transition-opacity hover:opacity-90 disabled:opacity-40";

export default function VoiceScene({
  scene,
  index,
  take,
  recording,
  elapsedMs,
  level,
  countdown,
  playing,
  disabled,
  onStartVoice,
  onStopVoice,
  onCancelVoice,
  onPlay,
  onDelete,
}: {
  scene: Scene;
  index: number;
  take: SceneTake;
  recording: boolean;
  elapsedMs: number;
  level: number;
  countdown: number | null;
  playing: boolean;
  disabled: boolean;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onCancelVoice: () => void;
  onPlay: () => void;
  onDelete: () => void;
}) {
  const hasTake = Boolean(take.blob);
  const silent = !scene.spokenLine.trim();
  const amber = take.wpmOutOfRange;
  const stale = hasTake && take.spokenLine !== scene.spokenLine;
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!take.blob) { setDownloadUrl(null); return; }
    const url = URL.createObjectURL(take.blob); setDownloadUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [take.blob]);

  return (
    <article className="border-b border-hairline py-5">
      <div className="flex items-start gap-3">
        <span className="mt-[7px] w-4 shrink-0 text-[11px] tabular-nums text-faint">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-[12.5px] text-ink">{scene.caption || "Scene"}</p>
            <span className="flex items-center gap-1.5 text-[11px] text-muted">
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${CHIP[take.status]}`}
              />
              {TAKE_STATUS_LABEL[take.status]}
              {hasTake && take.source === "tts" ? " · Generated voice" : null}
            </span>
          </div>

          <p className="mt-2 font-script text-[17px] leading-[1.7] text-ink">
            {silent ? "Silent visual transition — no narration needed." : scene.spokenLine}
          </p>
          {stale ? <p className="mt-2 text-[12px] text-flag">Script changed — record a new take, or delete this take to generate a new voice. Your previous audio is kept.</p> : null}
          {!lineFitsScene(scene) ? <p className="mt-2 text-[12px] text-flag">This line may not fit the footage. Shorten it before recording.</p> : null}

          {scene.visualDescription ? <p className="mt-2 text-[12px] text-muted">On screen: {scene.visualDescription}</p> : null}
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[11.5px] tabular-nums">
            <span className="text-muted">Target {formatClock(scene.seconds)}</span>
            <span className="text-ink">
              Take{" "}
              {take.durationSeconds != null
                ? formatClock(take.durationSeconds)
                : "—"}
            </span>
            {take.wpm != null ? (
              <span className={amber ? "text-flag" : "text-muted"}>
                {take.wpm} wpm
                {amber ? ` (aim ${WPM_MIN}–${WPM_MAX})` : ""}
              </span>
            ) : null}
            {take.status === "too-long" ? (
              <span className="text-flag">Longer than the scene — kept as recorded</span>
            ) : null}
          </div>

          {recording ? (
            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-[12px] tabular-nums text-ink">
                  {countdown != null
                    ? `Starting in ${countdown}…`
                    : `Recording ${formatClock(elapsedMs / 1000)}`}
                </p>
                <p className="text-[11px] text-muted">
                  Previous take is kept until you stop.
                </p>
              </div>
              <div className="mt-2 h-1.5 w-full bg-paper-sunk" aria-hidden>
                <div
                  className="h-full bg-accent transition-[width] duration-75"
                  style={{ width: `${Math.round(Math.min(1, level) * 100)}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <button type="button" onClick={onStopVoice} className={primary}>
                  Stop and keep
                </button>
                <button type="button" onClick={onCancelVoice} className={quiet}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={onStartVoice}
                disabled={disabled || silent}
                className={primary}
              >
                {hasTake ? "Re-record" : "Record"}
              </button>
              {hasTake ? (
                <>
                  <button type="button" disabled={disabled} onClick={onPlay} className={quiet}>
                    {playing ? "Playing…" : "Play"}
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={disabled}
                    className="text-[11.5px] text-faint hover:text-flag"
                  >
                    Delete
                  </button>
                  {downloadUrl ? <a href={downloadUrl} download={`scene-${index + 1}.${take.blob?.type.includes("wav") ? "wav" : take.blob?.type.includes("mp4") ? "m4a" : "webm"}`} className={quiet}>Download take</a> : null}
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
