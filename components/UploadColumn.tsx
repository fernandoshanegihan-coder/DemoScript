"use client";

import { useRef, useState } from "react";
import CaptureBar from "@/components/CaptureBar";
import RecordingStrip from "@/components/RecordingStrip";
import type { Shot, Tone } from "@/lib/types";

const TONES: { id: Tone; label: string }[] = [
  { id: "professional", label: "Professional" },
  { id: "energetic", label: "Energetic" },
  { id: "storytelling", label: "Storytelling" },
];

type Props = {
  shots: Shot[];
  rubric: string;
  tone: Tone;
  minutes: number;
  isSample: boolean;
  maxShots: number;
  notice: string | null;
  sharing: boolean;
  busy: boolean;
  status: string | null;
  onGenerate: () => void;
  onStartShare: () => void;
  onStopShare: () => void;
  onCaptureFrame: () => void;
  onAddFiles: (files: File[]) => void;
  onRubricChange: (value: string) => void;
  onToneChange: (tone: Tone) => void;
  onMinutesChange: (minutes: number) => void;
  onNoteChange: (shotId: string, note: string) => void;
  onAddAction: (shotId: string) => void;
  onActionNoteChange: (shotId: string, actionId: string, note: string) => void;
  onRemoveShot: (shotId: string) => void;
  onReorder: (from: number, to: number) => void;
  onClearSample: () => void;
  recorded: { posterDataUrl: string; durationSeconds: number } | null;
  recordingStarting: boolean;
  recording: boolean;
  recordingPaused: boolean;
  elapsedSeconds: number;
  limitSeconds: number;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onStopRecording: () => void;
  onRemoveRecording: () => void;
};

export default function UploadColumn({
  shots,
  rubric,
  tone,
  minutes,
  isSample,
  maxShots,
  notice,
  sharing,
  busy,
  status,
  onGenerate,
  onStartShare,
  onStopShare,
  onCaptureFrame,
  onAddFiles,
  onRubricChange,
  onToneChange,
  onMinutesChange,
  onNoteChange,
  onAddAction,
  onActionNoteChange,
  onRemoveShot,
  onReorder,
  onClearSample,
  recorded,
  recordingStarting,
  recording,
  recordingPaused,
  elapsedSeconds,
  limitSeconds,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  onRemoveRecording,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const hasShots = shots.length > 0;
  const hasMaterial = hasShots || recorded !== null;

  function pick(files: FileList | null) {
    if (!files || files.length === 0) return;
    onAddFiles(Array.from(files));
  }

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (isSample || recorded) return;
          pick(event.dataTransfer.files);
        }}
        className={`border border-dashed px-5 py-5 transition-colors ${
          dragging ? "border-accent bg-white/50" : "border-hairline"
        }`}
      >
        {recorded || recording || recordingStarting ? (
          <RecordingStrip
            posterDataUrl={recorded?.posterDataUrl ?? ""}
            durationSeconds={recorded?.durationSeconds ?? 0}
            limitSeconds={limitSeconds}
            recording={recording}
            paused={recordingPaused}
            starting={recordingStarting}
            elapsedSeconds={elapsedSeconds}
            onPause={onPauseRecording}
            onResume={onResumeRecording}
            onStop={onStopRecording}
            onRemove={onRemoveRecording}
            onRecordAgain={onStartRecording}
          />
        ) : (
          <>
        {sharing ? (
          <CaptureBar
            onCapture={onCaptureFrame}
            onStop={onStopShare}
            remaining={maxShots - shots.length}
          />
        ) : null}
        {hasShots ? (
          <ol className="space-y-3">
            {shots.map((shot, index) => (
              <li
                key={shot.id}
                draggable={!isSample}
                onDragStart={() => setDraggedIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.stopPropagation();
                  if (draggedIndex !== null && draggedIndex !== index) {
                    onReorder(draggedIndex, index);
                  }
                  setDraggedIndex(null);
                }}
                className="grid grid-cols-[64px_1fr] gap-3 border border-hairline bg-white/40 p-2.5"
              >
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shot.dataUrl}
                    alt={shot.fileName}
                    className="h-[46px] w-[64px] border border-hairline object-cover"
                  />
                  <span className="absolute -left-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-ink text-[9px] tabular-nums text-paper">
                    {index + 1}
                  </span>
                </div>
                <div className="min-w-0">
                  <input
                    value={shot.note}
                    onChange={(event) => onNoteChange(shot.id, event.target.value)}
                    readOnly={isSample}
                    placeholder="What do you do here?"
                    aria-label={`What do you do in screenshot ${index + 1}`}
                    className="w-full border-0 border-b border-transparent bg-transparent p-0 pb-1 text-[13px] text-ink outline-none placeholder:text-faint focus:border-hairline"
                  />
                  {shot.actions.map((action) => (
                    <input
                      key={action.id}
                      value={action.note}
                      onChange={(event) =>
                        onActionNoteChange(shot.id, action.id, event.target.value)
                      }
                      readOnly={isSample}
                      placeholder="Another action on this screen"
                      aria-label={`Another action on screenshot ${index + 1}`}
                      className="mt-1.5 w-full border-0 border-b border-transparent bg-transparent p-0 pb-1 text-[12.5px] text-muted outline-none placeholder:text-faint focus:border-hairline"
                    />
                  ))}
                  <div className="mt-1.5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onAddAction(shot.id)}
                      disabled={isSample}
                      className="text-[11.5px] text-accent underline decoration-hairline underline-offset-2 hover:decoration-accent disabled:text-faint"
                    >
                      + add another action
                    </button>
                    {!isSample ? (
                      <button
                        type="button"
                        onClick={() => onRemoveShot(shot.id)}
                        className="text-[11px] text-faint hover:text-ink"
                      >
                        Remove
                      </button>
                    ) : null}
                    <span className="ml-auto truncate text-[10.5px] text-faint">
                      {shot.fileName}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="py-2">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-[14px] leading-snug text-ink">
                  Drop screenshots here, in the order you'd show them.
                </p>
                <p className="mt-2 max-w-[26rem] text-[12.5px] leading-relaxed text-muted">
                  One screenshot is fine too. Add a note for each thing you'd do on
                  it.
                </p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-4 border border-hairline px-3 py-1.5 text-[12.5px] text-ink hover:border-accent"
                >
                  Choose screenshots
                </button>
                <button
                  type="button"
                  onClick={onStartShare}
                  className="mt-4 ml-2 border border-hairline px-3 py-1.5 text-[12.5px] text-ink hover:border-accent"
                >
                  Capture screenshots
                </button>
                <button
                  type="button"
                  onClick={onStartRecording}
                  disabled={isSample}
                  className="mt-4 ml-2 border border-hairline px-3 py-1.5 text-[12.5px] text-ink hover:border-accent disabled:cursor-default disabled:text-faint"
                >
                  Record screen
                </button>
                <p className="mt-2.5 text-[11.5px] text-faint">
                  Or record up to three minutes of clicking through it. Pause
                  whenever you need to — the gap is cut from the clip.
                </p>
              </div>
              <svg
                aria-hidden
                viewBox="0 0 46 40"
                className="mt-1 h-9 w-10 shrink-0 text-hairline"
                fill="none"
                stroke="currentColor"
              >
                <rect x="1" y="1" width="32" height="24" strokeWidth="1" />
                <rect x="6" y="6" width="32" height="24" strokeWidth="1" />
                <rect x="11" y="11" width="32" height="24" strokeWidth="1" />
              </svg>
            </div>
            <p className="mt-5 text-[11px] text-faint">
              Don't include passwords or personal data.
            </p>
          </div>
        )}
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            pick(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {hasShots && !isSample && !recorded && !recording && !recordingStarting ? (
        <div className="mt-2 flex items-center justify-between text-[11.5px]">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-accent underline decoration-hairline underline-offset-2 hover:decoration-accent"
          >
            Add more screenshots
          </button>
          <button
            type="button"
            onClick={onStartShare}
            className="text-accent underline decoration-hairline underline-offset-2 hover:decoration-accent"
          >
            Capture screenshots
          </button>
          <button
            type="button"
            onClick={onStartRecording}
            className="text-accent underline decoration-hairline underline-offset-2 hover:decoration-accent"
          >
            Record screen
          </button>
          <span className="text-faint">
            {shots.length} of {maxShots}
          </span>
        </div>
      ) : null}

      {notice ? <p className="mt-3 text-[12px] text-flag">{notice}</p> : null}

      <div className="mt-7">
        <label htmlFor="rubric" className="block text-[13px] text-muted">
          What will your video be judged on?
        </label>
        <textarea
          id="rubric"
          rows={4}
          readOnly={isSample}
          value={rubric}
          onChange={(event) => onRubricChange(event.target.value)}
          placeholder={
            "Paste the criteria, in whatever form you have them.\n\nDesign, Innovation, Presentation\nTechnical depth 40%, Documentation 20%, Demo 20%"
          }
          className="mt-2 w-full resize-none border border-hairline bg-transparent px-3 py-2.5 text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-faint focus:border-accent"
        />
        <p className="mt-2 text-[12px] text-muted">
          No rubric? Leave it empty and you'll get the script without the
          checklist.
        </p>
      </div>

      <div className="mt-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-2 text-[12px] text-muted">Tone</p>
          <div className="flex border border-hairline">
            {TONES.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={option.id === tone}
                disabled={isSample}
                onClick={() => onToneChange(option.id)}
                className={`px-3 py-1.5 text-[12.5px] disabled:cursor-default ${
                  option.id === tone ? "bg-ink text-paper" : "text-muted hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[12px] text-muted">Length</p>
          <div className="flex items-center gap-2 border border-hairline px-2 py-1">
            <button
              type="button"
              aria-label="Shorter"
              disabled={isSample || minutes <= 1}
              onClick={() => onMinutesChange(minutes - 1)}
              className="px-1 text-[13px] text-muted hover:text-ink disabled:text-hairline"
            >
              −
            </button>
            <span className="w-[3.2rem] text-center text-[12.5px] tabular-nums text-ink">
              {minutes} min
            </span>
            <button
              type="button"
              aria-label="Longer"
              disabled={isSample || minutes >= 3}
              onClick={() => onMinutesChange(minutes + 1)}
              className="px-1 text-[13px] text-muted hover:text-ink disabled:text-hairline"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={onGenerate}
          disabled={!hasMaterial || isSample || busy || recording || recordingStarting}
          className="w-full bg-accent px-4 py-2.5 text-[13.5px] text-paper transition-opacity disabled:cursor-not-allowed disabled:bg-paper-sunk disabled:text-faint"
        >
          {busy ? (status ?? "Working…") : "Make my script"}
        </button>
        <p className="mt-2 text-[12px] text-muted">
          {isSample
            ? "You're looking at a sample project."
            : recordingStarting
              ? "Pick a screen to start recording."
              : recording
                ? "Stop the recording first."
                : busy
                  ? "Keep this tab open — a recording takes a little longer to read."
                  : hasMaterial
                    ? "Ready when you are."
                    : "Record your screen, or add a screenshot to start."}
        </p>
        {isSample ? (
          <button
            type="button"
            onClick={onClearSample}
            className="mt-1 text-[12px] text-accent underline decoration-hairline underline-offset-4 hover:decoration-accent"
          >
            Start with your own screenshots
          </button>
        ) : null}
      </div>
    </div>
  );
}
