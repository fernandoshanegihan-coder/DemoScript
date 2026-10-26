"use client";

import { useRef, useState } from "react";
import ProgressBar from "@/components/ProgressBar";
import RecordingStrip from "@/components/RecordingStrip";
import ProjectInterview from "@/components/ProjectInterview";
import { hasStoryBrief, type ProjectBrief } from "@/lib/projectBrief";
import { formatClock } from "@/lib/timing";
import { PRESETS, presetById } from "@/lib/presets";
import type { Narrator, Preset, Recording } from "@/lib/types";

type Props = {
  recording: Recording | null;
  recordingStarting: boolean;
  recordingActive: boolean;
  recordingPaused: boolean;
  elapsedSeconds: number;
  limitSeconds: number;
  rubric: string;
  preset: Preset;
  narrator: Narrator;
  brief: ProjectBrief;
  onBriefChange: (brief: ProjectBrief) => void;
  /** A file being read for its length and poster, before it can be used. */
  inspecting: string | null;
  notice: string | null;
  busy: boolean;
  awaitingAnswers?: boolean;
  status: string | null;
  /** Seconds spent on the current generation, ticking while it runs. */
  processingSeconds: number | null;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onStopRecording: () => void;
  onRemoveRecording: () => void;
  onUploadRecording: (file: File) => void;
  onRubricChange: (value: string) => void;
  onPresetChange: (preset: Preset) => void;
  onNarratorChange: (narrator: Narrator) => void;
  onGenerate: () => void;
};

export default function UploadColumn({
  recording,
  recordingStarting,
  recordingActive,
  recordingPaused,
  elapsedSeconds,
  limitSeconds,
  rubric,
  preset,
  narrator,
  brief,
  onBriefChange,
  inspecting,
  notice,
  busy,
  awaitingAnswers = false,
  status,
  processingSeconds,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  onRemoveRecording,
  onUploadRecording,
  onRubricChange,
  onPresetChange,
  onNarratorChange,
  onGenerate,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const hasMaterial = recording !== null;
  const current = presetById(preset);

  function pick(files: FileList | null) {
    const file = files?.[0];
    if (file) onUploadRecording(file);
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
          if (recordingActive) return;
          pick(event.dataTransfer.files);
        }}
        className={`border border-dashed px-5 py-5 transition-colors ${
          dragging ? "border-accent bg-white/50" : "border-hairline"
        }`}
      >
        {recording || recordingActive || recordingStarting ? (
          <RecordingStrip
            posterDataUrl={recording?.posterDataUrl ?? ""}
            durationSeconds={recording?.durationSeconds ?? 0}
            limitSeconds={limitSeconds}
            recording={recordingActive}
            ready={false}
            floating={false}
            paused={recordingPaused}
            starting={recordingStarting}
            elapsedSeconds={elapsedSeconds}
            onStart={onStartRecording}
            onCancel={onRemoveRecording}
            onPause={onPauseRecording}
            onResume={onResumeRecording}
            onStop={onStopRecording}
            onRemove={onRemoveRecording}
            onRecordAgain={onStartRecording}
          />
        ) : (
          <div className="py-2">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-[14px] leading-snug text-ink">
                  Drop a screen recording here.
                </p>
                <p className="mt-2 max-w-[26rem] text-[12.5px] leading-relaxed text-muted">
                  One clip, picture only, up to three minutes. The script is
                  shaped by your project’s story and what happens on screen.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="border border-hairline px-3 py-1.5 text-[12.5px] text-ink hover:border-accent"
                  >
                    Choose a recording
                  </button>
                  <button
                    type="button"
                    onClick={onStartRecording}
                    className="border border-hairline px-3 py-1.5 text-[12.5px] text-ink hover:border-accent"
                  >
                    Record screen
                  </button>
                </div>
                <p className="mt-3 max-w-[26rem] text-[12px] leading-relaxed text-muted">
                  Already have a demo clip you like? Add it here and try the app
                  on it.
                </p>
              </div>
              <svg
                aria-hidden
                viewBox="0 0 46 40"
                className="mt-1 h-9 w-10 shrink-0 text-hairline"
                fill="none"
                stroke="currentColor"
              >
                <rect x="1" y="1" width="36" height="26" strokeWidth="1" />
                <path d="M14 33h10M19 27v6" strokeWidth="1" />
                <path d="M38 8v12M32 14h12" strokeWidth="1" />
              </svg>
            </div>
            <p className="mt-5 text-[11px] text-faint">
              Don&apos;t include passwords or personal data.
            </p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="video/*,.webm,.mp4,.mov"
          className="sr-only"
          onChange={(event) => {
            pick(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {inspecting ? <ProgressBar className="mt-3" label={inspecting} /> : null}

      {notice ? <p className="mt-3 text-[12px] text-flag">{notice}</p> : null}

      <div className="mt-7">
        <p className="text-[13px] text-muted">What is this demo for?</p>
        <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-2">
          {PRESETS.map((option) => {
            const active = option.id === preset;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => onPresetChange(option.id)}
                className={`border px-3 py-2 text-left transition-colors ${
                  active
                    ? "border-ink bg-white/60"
                    : "border-hairline hover:border-faint"
                }`}
              >
                <span className="block text-[12.5px] text-ink">{option.label}</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                  {option.blurb}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-muted">
          {current.label}: {current.guide.split(". ")[0]}.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-[11px] uppercase tracking-[0.08em] text-faint">
            Speaks as
          </span>
          <div className="flex border border-hairline">
            {(["i", "we"] as Narrator[]).map((option) => {
              const active = narrator === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onNarratorChange(option)}
                  className={`px-2.5 py-1 text-[12px] ${
                    active ? "bg-ink text-paper" : "text-muted hover:text-ink"
                  }`}
                >
                  {option === "i" ? "I" : "We"}
                </button>
              );
            })}
          </div>
          <span className="text-[11px] text-muted">
            {narrator === "we" ? "a team presenting" : "one person presenting"}
          </span>
        </div>
      </div>

      <ProjectInterview brief={brief} onChange={onBriefChange} disabled={busy} />

      <div className="mt-7">
        <label htmlFor="rubric" className="block text-[13px] text-muted">
          What will your video be judged on?
        </label>
        <textarea
          id="rubric"
          rows={4}
          value={rubric}
          onChange={(event) => onRubricChange(event.target.value)}
          placeholder={
            "Paste the criteria, in whatever form you have them.\n\nDesign, Innovation, Presentation\nTechnical depth 40%, Documentation 20%, Demo 20%"
          }
          className="mt-2 w-full resize-none border border-hairline bg-transparent px-3 py-2.5 text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-faint focus:border-accent"
        />
        <p className="mt-2 text-[12px] text-muted">
          No rubric? Leave it empty and you&apos;ll get the script without the
          checklist.
        </p>
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={onGenerate}
          disabled={!hasMaterial || !hasStoryBrief(brief) || busy || awaitingAnswers || recordingActive || recordingStarting}
          className="w-full bg-accent px-4 py-2.5 text-[13.5px] text-paper transition-opacity disabled:cursor-not-allowed disabled:bg-paper-sunk disabled:text-faint"
        >
          {busy ? (status ?? "Working…") : "Make my script"}
        </button>
        {busy ? (
          <ProgressBar
            className="mt-3"
            label={status ?? "Working…"}
            hint={
              processingSeconds != null
                ? `${formatClock(processingSeconds)} so far — keep this tab open.`
                : "Keep this tab open — the clip is read once, on the server."
            }
          />
        ) : (
          <p className="mt-2 text-[12px] text-muted">
            {recordingStarting
              ? "Pick a screen to start recording."
              : recordingActive
                ? "Stop the recording first."
                : awaitingAnswers ? "Continue with the follow-up questions beside your recording."
                : hasMaterial
                  ? hasStoryBrief(brief) ? "Ready to turn your story and footage into a demo." : "Answer the first three project questions to start."
                  : "Upload a recording, or record your screen, to start."}
          </p>
        )}
      </div>
    </div>
  );
}
