import { inspectVideo } from "./recorder";
import { SAMPLE_VIDEO, SAMPLE_DURATION, sampleScenes } from "./sampleDemo";
import { takeFrom } from "./voiceRecorder";
import type { SceneTake } from "./types";

export async function loadSampleDemo(signal: AbortSignal) {
  const get = async (url: string) => {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error("The sample could not be loaded. Your saved project is unchanged. Please try again.");
    return response;
  };
  const [videoResponse, manifestResponse] = await Promise.all([get(SAMPLE_VIDEO), get("/sample/launchpad/narration.json")]);
  const manifest: { id: string; seconds: number; spokenLine: string }[] = await manifestResponse.json();
  const scenes = sampleScenes();
  if (!Array.isArray(manifest) || manifest.length !== scenes.length) throw new Error("The sample narration is incomplete. Your saved project is unchanged.");
  const recording = await inspectVideo(new File([await videoResponse.blob()], "launchpad.mp4", { type: "video/mp4" }));
  if (Math.abs(recording.durationSeconds - SAMPLE_DURATION) > .025) throw new Error("The sample recording and script do not match. Your saved project is unchanged.");
  // Clip metadata can vary slightly across browser decoders. Keep the last slot inside it.
  const last = scenes.at(-1)!;
  last.seconds = recording.durationSeconds - (last.startSeconds ?? 0);
  const takes = new Map<string, SceneTake>();
  for (const scene of scenes) {
    const item = manifest.find(row => row.id === scene.id);
    if (!item || item.spokenLine !== scene.spokenLine || !Number.isFinite(item.seconds) || item.seconds <= 0 || item.seconds > scene.seconds) throw new Error("The sample voice does not match its scene. Your saved project is unchanged.");
    const audio = await (await get(`/sample/launchpad/${scene.id}.wav`)).blob();
    if (!audio.size || !audio.type.includes("audio/")) throw new Error("The sample audio could not be read. Please try again.");
    takes.set(scene.id, takeFrom(audio, item.seconds, "tts", scene.spokenLine, scene.seconds));
  }
  signal.throwIfAborted();
  return { recording, scenes, takes };
}
