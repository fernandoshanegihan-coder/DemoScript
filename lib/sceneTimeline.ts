import type { Scene } from "./types";

export class SceneTimingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SceneTimingError";
  }
}

export type GeneratedVisualScene = {
  startSeconds: number;
  visualDescription: string;
  spokenLine: string;
  caption: string;
  covers: string[];
};

/** Identical starts describe one interval. Merge content, never invent a new time. */
export function mergeCoincidentScenes<T extends GeneratedVisualScene>(scenes: T[]): T[] {
  const grouped = new Map<number, T>();
  for (const scene of scenes) {
    const existing = grouped.get(scene.startSeconds);
    if (!existing) { grouped.set(scene.startSeconds, { ...scene }); continue; }
    const join = (a: string, b: string) => [...new Set([a.trim(), b.trim()].filter(Boolean))].join(" ");
    grouped.set(scene.startSeconds, {
      ...existing,
      visualDescription: join(existing.visualDescription, scene.visualDescription),
      spokenLine: join(existing.spokenLine, scene.spokenLine),
      covers: [...new Set([...existing.covers, ...scene.covers])],
    });
  }
  return [...grouped.values()];
}

/** Keep visual evidence attached to its timestamp. Never invent scene times. */
export function orderVisualScenes<T extends { startSeconds: number }>(scenes: T[], duration: number): T[] {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("Invalid clip duration.");
  const ordered = [...scenes].sort((a, b) => a.startSeconds - b.startSeconds);
  if (ordered.length === 0) throw new SceneTimingError("No scene timestamps were returned.");
  let previous = -1;
  for (const scene of ordered) {
    if (!Number.isFinite(scene.startSeconds) || scene.startSeconds < 0 ||
        scene.startSeconds >= duration || scene.startSeconds <= previous) {
      throw new SceneTimingError(`The scene timestamps overlap or fall outside the clip. Start ${scene.startSeconds}, previous ${previous}, clip end ${duration}.`);
    }
    previous = scene.startSeconds;
  }
  return ordered;
}

/** Re-read the same footage once, with the timing failure made explicit. */
export async function generateTimedResult<T extends { scenes: { startSeconds: number }[] }>(
  generate: (correction?: string) => Promise<T>, duration: number,
  onInvalid?: (details: { pass: number; starts: number[]; reason: string }) => void,
): Promise<T> {
  let correction: string | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await generate(correction);
    try {
      orderVisualScenes(result.scenes ?? [], duration);
      return result;
    } catch (error) {
      if (!(error instanceof SceneTimingError)) throw error;
      onInvalid?.({ pass: attempt + 1, starts: result.scenes?.map(scene => scene.startSeconds) ?? [], reason: error.message });
      if (attempt === 1) throw new SceneTimingError(
        "Gemini read your recording, but its scene timings were invalid after an automatic correction attempt. Your clip is safe. Press Make my script to try again.",
      );
      correction = [
        "Your previous answer had invalid scene timing:", error.message,
        `Returned startSeconds: ${JSON.stringify(result.scenes?.map(scene => scene.startSeconds))}.`,
        `Re-watch the attached footage and return the full corrected script. Use numeric seconds from 0 inclusive to ${duration} exclusive.`,
        "Keep each description and spoken line attached to its actual visual moment. Merge scenes with identical starts; do not nudge timestamps or distribute scenes evenly.",
        "Do not add a scene or end marker at the clip's final timestamp. Do not use MMSS numbers, milliseconds or strings.",
      ].join("\n");
    }
  }
  throw new Error("Unreachable timing validation state.");
}

export function sceneAtVideoTime(scenes: Scene[], time: number): number {
  return scenes.findIndex((scene) => {
    const start = scene.startSeconds ?? 0;
    return time >= start && time < start + scene.seconds;
  });
}

export function lineFitsScene(scene: Scene): boolean {
  return scene.spokenLine.trim().split(/\s+/).filter(Boolean).length <= Math.floor(scene.seconds * 2.4);
}
