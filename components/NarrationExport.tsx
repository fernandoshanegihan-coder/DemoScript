"use client";

import { useEffect, useRef, useState } from "react";
import { buildNarration } from "@/lib/narration";
import type { CombinedVideo } from "@/lib/videoExport";
import type { Recording, Scene, SceneTake } from "@/lib/types";

type ExportResult = { blob: Blob; scenes: Scene[]; takes: Map<string, SceneTake>; clip: Recording; video?: CombinedVideo };

export default function NarrationExport({ scenes, takes, clip, clipUrl, disabled, onBusyChange }: {
  scenes: Scene[]; takes: Map<string, SceneTake>; clip: Recording; clipUrl: string; disabled: boolean; onBusyChange: (busy: boolean) => void;
}) {
  const [result, setResult] = useState<ExportResult | null>(null);
  const [operation, setOperation] = useState<"narration" | "video" | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const current = result?.scenes === scenes && result.takes === takes && result.clip === clip;
  const busy = operation !== null;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; abortRef.current?.abort(); onBusyChange(false); };
  }, [onBusyChange]);

  useEffect(() => {
    if (!current || !result) { setUrl(null); setVideoUrl(null); return; }
    const wavUrl = URL.createObjectURL(result.blob);
    const combinedUrl = result.video ? URL.createObjectURL(result.video.blob) : null;
    setUrl(wavUrl); setVideoUrl(combinedUrl);
    return () => { URL.revokeObjectURL(wavUrl); if (combinedUrl) URL.revokeObjectURL(combinedUrl); };
  }, [current, result]);

  async function build(withVideo: boolean) {
    if (busy || disabled || abortRef.current) return;
    const controller = new AbortController(); abortRef.current = controller;
    setOperation(withVideo ? "video" : "narration"); setProgress(0); setError(null); onBusyChange(true);
    previewRef.current?.pause(); audioRef.current?.pause();
    try {
      const narration = current && result ? result.blob : await buildNarration(scenes, takes, clip.durationSeconds, controller.signal);
      controller.signal.throwIfAborted();
      const next: ExportResult = { blob: narration, scenes, takes, clip, video: current ? result?.video : undefined };
      if (mountedRef.current) setResult(next);
      if (withVideo) {
        const { combineVideoAndNarration } = await import("@/lib/videoExport");
        controller.signal.throwIfAborted();
        const video = await combineVideoAndNarration(clip.blob, narration, clip.durationSeconds, {
          signal: controller.signal, onProgress: fraction => { if (mountedRef.current) setProgress(fraction); },
        });
        if (mountedRef.current) setResult({ ...next, video });
      }
    } catch (cause) {
      if (mountedRef.current) setError(controller.signal.aborted ? "Export cancelled. Your recordings are kept." : cause instanceof Error ? cause.message : "The video could not be created. Your recordings are kept.");
    } finally {
      abortRef.current = null;
      if (mountedRef.current) { setOperation(null); onBusyChange(false); }
    }
  }

  return <section className="mt-6 border-t border-hairline pt-4">
    <h3 className="text-[13px] text-ink">Your finished demo</h3>
    <p className="mt-2 text-[12px] leading-relaxed text-muted">Record or generate each spoken scene, then create one video with your narration included. The voice starts at each scene’s timestamp; gaps stay silent. Long or outdated takes need replacing.</p>
    <div className="mt-3 flex flex-wrap items-center gap-4">
      <button type="button" disabled={disabled || busy || scenes.length === 0} onClick={() => void build(true)} className="bg-accent px-3 py-2 text-[12px] text-paper disabled:opacity-40">
        {operation === "video" ? `Creating video with sound… ${Math.round(progress * 100)}%` : "Create video with narration"}
      </button>
      {busy ? <button type="button" onClick={() => abortRef.current?.abort()} className="text-[12px] text-muted underline">Cancel export</button> : null}
    </div>
    {busy ? <p role="status" className="mt-2 text-[12px] text-muted">Keep this page open while the file is prepared in your browser.</p> : null}
    {error ? <p role="alert" className="mt-2 text-[12px] text-flag">{error}</p> : null}
    {current && videoUrl && result?.video && !disabled && !busy ? <div className="mt-4">
      <p className="mb-2 text-[12px] text-muted">This preview and download contain both the video and your narration.</p>
      <video ref={previewRef} src={videoUrl} controls playsInline className="w-full bg-ink" />
      <a href={videoUrl} download={`demo-with-narration.${result.video.extension}`} className="mt-3 inline-block bg-accent px-3 py-2 text-[12px] text-paper">Download video with narration (.{result.video.extension})</a>
    </div> : current && url && !disabled && !busy ? <div className="mt-4">
      <p className="mb-2 text-[12px] text-muted">Preview your aligned narration. Create the combined video above to include this sound in the video download.</p>
      <video ref={previewRef} src={clipUrl} controls muted playsInline className="w-full bg-ink"
        onPlay={event => { const video = event.currentTarget; const audio = audioRef.current; if (audio) { audio.currentTime = video.currentTime; void audio.play().catch(() => { video.pause(); setError("Press play again to allow narration playback."); }); } }}
        onPause={() => audioRef.current?.pause()} onEnded={() => audioRef.current?.pause()}
        onSeeking={event => { if (audioRef.current) audioRef.current.currentTime = event.currentTarget.currentTime; }}
        onRateChange={event => { if (audioRef.current) audioRef.current.playbackRate = event.currentTarget.playbackRate; }}
        onTimeUpdate={event => { const audio = audioRef.current; if (audio && Math.abs(audio.currentTime - event.currentTarget.currentTime) > 0.15) audio.currentTime = event.currentTarget.currentTime; }}
      />
      <audio ref={audioRef} src={url} preload="auto" />
    </div> : null}
    <details className="mt-4 text-[12px] text-muted">
      <summary className="cursor-pointer">Separate files</summary>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button type="button" disabled={disabled || busy || scenes.length === 0} onClick={() => void build(false)} className="text-accent underline disabled:opacity-40">{operation === "narration" ? "Building narration…" : "Build aligned narration"}</button>
        {current && url && !busy ? <a href={url} download="demo-narration.wav" className="text-accent underline">Download aligned narration WAV</a> : null}
        <a href={clipUrl} download={`original-recording.${clip.mimeType.includes("mp4") ? "mp4" : clip.mimeType.includes("quicktime") ? "mov" : "webm"}`} className="underline">Original recording (without narration)</a>
      </div>
    </details>
  </section>;
}
