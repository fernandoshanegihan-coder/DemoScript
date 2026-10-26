"use client";

import { useEffect, useRef, useState } from "react";
import { takeFrom } from "@/lib/voiceRecorder";
import type { Scene, SceneTake } from "@/lib/types";

export default function AutomaticNarration({ scenes, takes, disabled, onTakeChange, onBusyChange }: {
  scenes: Scene[]; takes: Map<string, SceneTake>; disabled: boolean;
  onTakeChange: (id: string, take: SceneTake) => void; onBusyChange: (busy: boolean) => void;
}) {
  const [voice, setVoice] = useState("en-US-JennyNeural");
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const latest = useRef({ scenes, takes }); latest.current = { scenes, takes };
  const missing = scenes.filter(scene => scene.spokenLine.trim() && !takes.get(scene.id)?.blob);

  useEffect(() => () => { abortRef.current?.abort(); onBusyChange(false); }, [onBusyChange]);

  async function generate() {
    if (disabled || abortRef.current || !missing.length) return;
    const controller = new AbortController(); abortRef.current = controller;
    const jobs = [...missing];
    setMessage(null); onBusyChange(true);
    try {
      for (let index = 0; index < jobs.length; index++) {
        controller.signal.throwIfAborted();
        const scene = jobs[index];
        if (latest.current.takes.get(scene.id)?.blob) continue;
        setProgress(`Creating voice ${index + 1} of ${jobs.length}…`);
        const response = await fetch("/api/speech", {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
          body: JSON.stringify({ text: scene.spokenLine, seconds: scene.seconds, voice }),
        });
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error ?? "The voice could not be created. Please try again.");
        }
        const duration = Number(response.headers.get("X-Audio-Duration"));
        const blob = await response.blob();
        controller.signal.throwIfAborted();
        if (!blob.size || !blob.type.includes("audio/wav") || !Number.isFinite(duration) || duration <= 0 || duration > scene.seconds) throw new Error("This voice did not fit its scene. Your existing takes are kept.");
        // A late response must never overwrite a take or attach to an edited scene.
        const currentScene = latest.current.scenes.find(item => item.id === scene.id);
        if (!currentScene || currentScene.spokenLine !== scene.spokenLine || currentScene.seconds !== scene.seconds || latest.current.takes.get(scene.id)?.blob) continue;
        onTakeChange(scene.id, takeFrom(blob, duration, "tts", scene.spokenLine, scene.seconds));
      }
      setMessage("Narration is ready. Play the scenes to review it, then create your video with narration.");
    } catch (error) {
      if (controller.signal.aborted) setMessage("Stopped. Completed voices and your recordings are saved.");
      else setMessage(error instanceof Error ? error.message : "Automatic voice could not finish. Completed takes are saved.");
    } finally {
      if (abortRef.current === controller) { abortRef.current = null; setProgress(null); onBusyChange(false); }
    }
  }

  return <section className="mb-5 border border-hairline p-4">
    <h3 className="text-[13px] text-ink">Let a voice read your script</h3>
    <p className="mt-2 text-[12px] leading-relaxed text-muted">Generate narration for empty scenes. Each voice is checked against its scene’s duration. Your existing takes are kept. Script text is sent to Microsoft Azure to create the audio.</p>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <label className="text-[12px] text-muted">Voice <select aria-label="Narration voice" value={voice} disabled={disabled || Boolean(progress)} onChange={event => setVoice(event.target.value)} className="ml-2 border border-hairline bg-paper p-2 text-ink">
        <option value="en-US-JennyNeural">Jenny · US English</option>
        <option value="en-US-GuyNeural">Guy · US English</option>
        <option value="en-GB-SoniaNeural">Sonia · British English</option>
      </select></label>
      <button type="button" disabled={disabled || Boolean(progress) || !missing.length} onClick={() => void generate()} className="bg-accent px-3 py-2 text-[12px] text-paper disabled:opacity-40">{progress ?? "Generate missing narration"}</button>
      {progress ? <button type="button" onClick={() => abortRef.current?.abort()} className="text-[12px] text-muted underline">Stop generating</button> : null}
    </div>
    {progress ? <p role="status" className="mt-2 text-[12px] text-muted">{progress} You can stop and continue later.</p> : null}
    {message ? <p role="status" className="mt-2 text-[12px] text-muted">{message}</p> : null}
    {!missing.length ? <p className="mt-2 text-[12px] text-muted">Every spoken scene has a take. To change a generated voice, download or delete that scene’s take first.</p> : null}
  </section>;
}
