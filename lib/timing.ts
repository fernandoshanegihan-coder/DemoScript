import type { Scene, SceneTake, TakeSource } from "@/lib/types";

export const WPM_RATIOS: Record<TakeSource, number> = {
  voice: 160,
  tts: 160,
};
/** Approximate spoken length of a line, calibrated by voice pace. */
export function secondsFor(line: string, source: TakeSource): number {
  const words = line.trim().split(/\s+/).filter(Boolean).length;
  const wpm = WPM_RATIOS[source];
  return Math.round((words / wpm) * 60);
}/** Dev-only: log per-scene timing data to console. Enable with process.env.NODE_ENV === "development" */
export function debugSceneTiming(scenes: Scene[], takes: Map<string, SceneTake> | null, clipSeconds: number): void {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "development") return;
  console.log("\n=== DemoScript Scene Timing Debug ===");
  scenes.forEach((scene, i) => {
    const take = takes?.get(scene.id);
    const nextScene = scenes[i + 1];
    const slotSeconds = scene.startSeconds != null && nextScene?.startSeconds != null
      ? nextScene.startSeconds - scene.startSeconds
      : clipSeconds - (scene.startSeconds ?? 0);
    const wordCount = (scene.spokenLine?.trim().split(/\s+/).filter(Boolean).length ?? 0);
    const estimatedSeconds = secondsFor(scene.spokenLine ?? "", take?.source ?? "voice");
    const actualSeconds = take?.durationSeconds ?? 0;
    console.log(
      `Scene ${i + 1} [${scene.id}]:`,
      `slot=${slotSeconds}s words=${wordCount} est=${estimatedSeconds}s act=${actualSeconds}s`,
    );
  });
  console.log("========================================\n");
}


/**
 * Which scene should be on screen at `elapsed`, given each scene's spoken
 * length in order. Past the last scene, the last one stays up — the read can
 * run over without the page losing its place.
 */
export function sceneIndexAt(durations: number[], elapsed: number): number {
  if (durations.length === 0) return -1;
  let end = 0;
  for (let index = 0; index < durations.length; index += 1) {
    end += Math.max(0, durations[index]);
    if (elapsed < end) return index;
  }
  return durations.length - 1;
}

/** What the rehearsal says when it stops. Plain, and never a score. */
export function rehearsalSummary(elapsed: number, planned: number): string {
  const read = Math.max(0, Math.round(elapsed));
  const whole = Math.max(0, Math.round(planned));

  if (read === 0) return "The clock stopped before you started.";
  if (read < whole) {
    return `You stopped at ${formatClock(read)} of ${formatClock(whole)} — ${formatClock(whole - read)} left.`;
  }
  if (read === whole) {
    return `You read the whole script — ${formatClock(whole)}.`;
  }
  return `You read ${formatClock(read)} against ${formatClock(whole)} — ${formatClock(read - whole)} over.`;
}

/** 161 -> "2:41" */
export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}
