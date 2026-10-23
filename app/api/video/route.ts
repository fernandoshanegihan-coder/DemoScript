import {
  GeminiError,
  SCRIPT_FALLBACK_MODEL,
  SCRIPT_MODEL,
  generateJson,
  getGeminiClient,
  videoScriptSchema,
} from "@/lib/gemini";
import { normalizeCriteria } from "@/lib/criteria";
import { videoInstruction, videoSystem } from "@/lib/prompts";
import type { Criterion, Tone } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const TONES: Tone[] = ["professional", "energetic", "storytelling"];
const MAX_BYTES = 250 * 1024 * 1024;
const ACTIVATE_TIMEOUT_MS = 90_000;

type RawVideoResult = {
  criteria: { id: string; label: string; source: string }[];
  scenes: {
    startSeconds: number;
    spokenLine: string;
    caption: string;
    covers: string[];
  }[];
};

type VideoScene = {
  shotId: string;
  actionId: string;
  startSeconds: number;
  spokenLine: string;
  caption: string;
  covers: string[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The model's timestamps are an estimate. Sort them, pin the first to zero,
 * clamp them inside the clip, and nudge collisions forward so no two scenes
 * claim the same second. If any are missing, fall back to even spacing — that
 * is always watchable, while a few invented seconds are not.
 */
function arrangeStarts(values: number[], durationSeconds: number): number[] {
  const maxStart = Math.max(0, durationSeconds - 0.5);
  const missing = values.some((value) => !Number.isFinite(value));

  if (missing) {
    return values.map((_, index) =>
      Math.min(maxStart, Math.round((durationSeconds * index) / values.length)),
    );
  }

  let previous = -1;
  return [...values]
    .map((value) => Math.min(maxStart, Math.max(0, Math.round(value))))
    .sort((a, b) => a - b)
    .map((value, index) => {
      let next = index === 0 ? 0 : value;
      if (next <= previous) next = Math.min(maxStart, previous + 1);
      previous = next;
      return next;
    });
}

function sanitize(
  raw: RawVideoResult,
  durationSeconds: number,
): { criteria: Criterion[]; scenes: VideoScene[] } {
  const { criteria, idFor } = normalizeCriteria(raw.criteria);

  const kept = (raw.scenes ?? [])
    .map((scene) => ({
      spokenLine: typeof scene.spokenLine === "string" ? scene.spokenLine.trim() : "",
      caption: typeof scene.caption === "string" ? scene.caption.trim() : "",
      startSeconds: Number(scene.startSeconds),
      covers: Array.isArray(scene.covers) ? scene.covers : [],
    }))
    .filter((scene) => scene.spokenLine);

  if (kept.length === 0) {
    throw new GeminiError(
      "failed",
      "Gemini didn't write any scenes from that recording. Try recording again, or use screenshots.",
    );
  }

  const starts = arrangeStarts(
    kept.map((scene) => scene.startSeconds),
    durationSeconds,
  );

  // Starting from 0 means the sorted order is also the order of the script.
  const ordered = kept
    .map((scene, index) => ({ ...scene, startSeconds: starts[index] }))
    .sort((a, b) => a.startSeconds - b.startSeconds);

  return {
    criteria,
    scenes: ordered.map((scene) => ({
      shotId: "recording",
      actionId: "",
      startSeconds: scene.startSeconds,
      spokenLine: scene.spokenLine,
      caption: scene.caption,
      covers: [
        ...new Set(
          scene.covers
            .map((ref) => idFor(String(ref)))
            .filter((id): id is string => Boolean(id)),
        ),
      ],
    })),
  };
}

function failure(error: unknown): Response {
  if (error instanceof GeminiError) {
    const status =
      error.code === "rate-limit" ? 429 : error.code === "no-key" ? 400 : 502;
    return Response.json({ error: error.message }, { status });
  }
  console.error("/api/video failed", error);
  return Response.json(
    { error: "The recording couldn't be read. It's still in this tab — try again." },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { error: "That recording didn't arrive in one piece." },
      { status: 400 },
    );
  }

  const file = form.get("video");
  if (!(file instanceof Blob) || file.size === 0) {
    return Response.json({ error: "No recording to read." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "That recording is too large to send. Three minutes is the limit." },
      { status: 413 },
    );
  }

  const rubric = String(form.get("rubric") ?? "").slice(0, 6000);
  const rawTone = String(form.get("tone") ?? "");
  const tone = TONES.includes(rawTone as Tone) ? (rawTone as Tone) : "professional";
  const minutes = Math.min(3, Math.max(1, Math.round(Number(form.get("minutes")) || 2)));
  const durationSeconds = Math.min(
    180,
    Math.max(1, Math.round(Number(form.get("duration")) || 0)),
  );

  const ai = getGeminiClient();
  let uploadedName: string | null = null;

  try {
    const mimeType =
      file.type && file.type !== "application/octet-stream" ? file.type : "video/webm";

    let uploaded = await ai.files.upload({
      file,
      config: { mimeType, displayName: "demoscript-recording" },
    });
    uploadedName = uploaded.name ?? null;

    const deadline = Date.now() + ACTIVATE_TIMEOUT_MS;
    while (uploaded.state === "PROCESSING" && Date.now() < deadline) {
      await sleep(2000);
      if (!uploaded.name) break;
      uploaded = await ai.files.get({ name: uploaded.name });
    }

    if (uploaded.state !== "ACTIVE" || !uploaded.uri) {
      throw new GeminiError(
        "failed",
        "That recording didn't finish processing in time. It's still in this tab — try again.",
      );
    }

    const raw = await generateJson<RawVideoResult>({
      parts: [
        {
          fileData: {
            fileUri: uploaded.uri,
            mimeType: uploaded.mimeType ?? mimeType,
          },
        },
        {
          text: videoInstruction({
            durationSeconds,
            rubric,
            tone,
            seconds: minutes * 60,
          }),
        },
      ],
      schema: videoScriptSchema,
      systemInstruction: videoSystem(tone),
      temperature: 0.5,
      models: [SCRIPT_MODEL, SCRIPT_FALLBACK_MODEL],
    });

    return Response.json(sanitize(raw, durationSeconds));
  } catch (error) {
    return failure(error);
  } finally {
    if (uploadedName) {
      // The clip stays in the student's tab, not in the project's file storage.
      await ai.files.delete({ name: uploadedName }).catch(() => undefined);
    }
  }
}
