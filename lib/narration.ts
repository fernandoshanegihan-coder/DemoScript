import type { Scene, SceneTake } from "./types";

export type AudioSegment = { start: number; slot: number; samples: Float32Array };
export const SAMPLE_RATE = 48000;

/** Silence remains where scenes were deleted; later narration never shifts. */
export function mixTimeline(segments: AudioSegment[], duration: number, rate = SAMPLE_RATE): Float32Array {
  const output = new Float32Array(Math.ceil(duration * rate));
  let previousEnd = 0;
  for (const segment of [...segments].sort((a, b) => a.start - b.start)) {
    const offset = Math.round(segment.start * rate);
    if (!Number.isFinite(segment.start) || segment.start < 0 || segment.slot <= 0 ||
        segment.samples.length > Math.round(segment.slot * rate) ||
        offset < previousEnd || offset + segment.samples.length > output.length) {
      throw new Error("A take runs past its scene. Record a shorter take before exporting.");
    }
    output.set(segment.samples, offset);
    previousEnd = offset + segment.samples.length;
  }
  return output;
}

export function encodeWav(samples: Float32Array, rate = SAMPLE_RATE): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  text(0, "RIFF"); view.setUint32(4, buffer.byteLength - 8, true); text(8, "WAVE");
  text(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, i) => { const value = Math.max(-1, Math.min(1, sample)); view.setInt16(44 + i * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true); });
  return new Blob([buffer], { type: "audio/wav" });
}

export async function buildNarration(scenes: Scene[], takes: Map<string, SceneTake>, duration: number, signal?: AbortSignal): Promise<Blob> {
  signal?.throwIfAborted();
  const context = new AudioContext({ sampleRate: SAMPLE_RATE });
  try {
    const segments: AudioSegment[] = [];
    for (let index = 0; index < scenes.length; index++) {
      signal?.throwIfAborted();
      const scene = scenes[index];
      if (!scene.spokenLine.trim()) continue;
      const take = takes.get(scene.id);
      if (!take?.blob) throw new Error(`Record scene ${index + 1} before exporting.`);
      if (take.spokenLine !== scene.spokenLine) throw new Error(`Scene ${index + 1} has changed. Re-record it to match the script.`);
      const decoded = await context.decodeAudioData(await take.blob.arrayBuffer());
      signal?.throwIfAborted();
      // Offline rendering resamples and downmixes every browser's recording format.
      const renderer = new OfflineAudioContext(1, Math.ceil(decoded.duration * SAMPLE_RATE), SAMPLE_RATE);
      const source = renderer.createBufferSource(); source.buffer = decoded; source.connect(renderer.destination); source.start();
      const mono = await renderer.startRendering();
      segments.push({ start: scene.startSeconds ?? 0, slot: scene.seconds, samples: mono.getChannelData(0) });
    }
    signal?.throwIfAborted();
    return encodeWav(mixTimeline(segments, duration));
  } finally { await context.close(); }
}
