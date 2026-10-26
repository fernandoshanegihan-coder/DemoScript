import {
  GeminiError,
  SCRIPT_FALLBACK_MODEL,
  SCRIPT_MODEL,
  generateJson,
  getGeminiClient,
  videoScriptSchemaFor,
} from "@/lib/gemini";
import { normalizeCriteria } from "@/lib/criteria";
import { generateTimedResult, mergeCoincidentScenes, orderVisualScenes, SceneTimingError } from "@/lib/sceneTimeline";
import { DEFAULT_PRESET, isNarrator, isPreset, narratorFor } from "@/lib/presets";
import { videoInstruction, videoSystem } from "@/lib/prompts";
import type { Criterion, Narrator, Preset } from "@/lib/types";
import { hasStoryBrief, normalizeBrief, type ProjectBrief } from "@/lib/projectBrief";
import { prepareDescriptiveStory, type StoryPreparation } from "@/lib/storyEditor";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 250 * 1024 * 1024;
const ACTIVATE_TIMEOUT_MS = 90_000;

type RawVideoResult = {
  criteria: { id: string; label: string; source: string }[];
  scenes: {
    visualDescription: string;
    startSeconds: number;
    spokenLine: string;
    caption: string;
    covers: string[];
  }[];
};

type VideoScene = {
  visualDescription: string;
  startSeconds: number;
  spokenLine: string;
  caption: string;
  covers: string[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitize(
  raw: RawVideoResult,
  durationSeconds: number,
): { criteria: Criterion[]; scenes: VideoScene[] } {
  const { criteria, idFor } = normalizeCriteria(raw.criteria);

  const kept = (raw.scenes ?? [])
    .map((scene) => ({
      visualDescription: typeof scene.visualDescription === "string" ? scene.visualDescription.trim() : "",
      spokenLine: typeof scene.spokenLine === "string" ? scene.spokenLine.trim() : "",
      caption: typeof scene.caption === "string" ? scene.caption.trim() : "",
      startSeconds: scene.startSeconds,
      covers: Array.isArray(scene.covers) ? scene.covers : [],
    }))
    .filter((scene) => scene.spokenLine);

  if (kept.length === 0) {
    throw new GeminiError(
      "failed",
      "Gemini didn't write any scenes from that recording. It's still in this tab — try again.",
    );
  }

  const ordered = orderVisualScenes(kept, durationSeconds);

  return {
    criteria,
    scenes: ordered.map((scene) => ({
      visualDescription: scene.visualDescription,
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
  const began = performance.now();
  const requestId = crypto.randomUUID();
  const log = (event: string, details: Record<string, unknown> = {}) => {
    console.info("[video-timing]", JSON.stringify({ requestId, event, elapsedMs: Math.round(performance.now() - began), ...details }));
  };
  const measure = async <T>(stage: string, work: () => Promise<T>): Promise<T> => {
    const started = performance.now();
    log(`${stage}:start`);
    try {
      const value = await work();
      log(`${stage}:end`, { stageMs: Math.round(performance.now() - started), outcome: "success" });
      return value;
    } catch (error) {
      log(`${stage}:end`, { stageMs: Math.round(performance.now() - started), outcome: "error" });
      throw error;
    }
  };
  log("request:start");
  let form: FormData;
  try {
    form = await measure("receive-video", () => request.formData());
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
  let brief: ProjectBrief;
  try { brief = normalizeBrief(JSON.parse(String(form.get("brief") ?? "{}"))); }
  catch { return Response.json({ error: "Your project answers could not be read. Please check them and try again." }, { status: 400 }); }
  if (!hasStoryBrief(brief)) {
    return Response.json({ error: "Answer who the project helps, what you built, and the key moments to highlight before generating your demo." }, { status: 400 });
  }
  const rawPreset = String(form.get("preset") ?? "");
  const preset: Preset = isPreset(rawPreset) ? rawPreset : DEFAULT_PRESET;
  const rawNarrator = String(form.get("narrator") ?? "");
  // A team hackathon says "we"; the other demo types say "I", until changed.
  const narrator: Narrator = isNarrator(rawNarrator) ? rawNarrator : narratorFor(preset);
  const durationSeconds = Number(form.get("duration"));
  log("input", { bytes: file.size, durationSeconds });
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 180) {
    return Response.json({ error: "Use a recording no longer than three minutes." }, { status: 400 });
  }

  // A missing key is refused before anything streams, so the page can show it.
  let ai: ReturnType<typeof getGeminiClient>;
  try {
    ai = getGeminiClient();
  } catch (error) {
    return failure(error);
  }

  const encoder = new TextEncoder();

  /**
   * Three stages stream back as they start: the clip going up, Gemini chewing
   * on it, and the scenes being written. The page turns them into the label
   * beside its progress bar; no amount is claimed, because none is known.
   */
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      let uploadedName: string | null = null;

      try {
        send({ type: "stage", stage: "reading" });

        const mimeType =
          file.type && file.type !== "application/octet-stream" ? file.type : "video/webm";

        let uploaded = await measure("upload-to-gemini", () => ai.files.upload({
          file,
          config: { mimeType, displayName: "demoscript-recording" },
        }));
        uploadedName = uploaded.name ?? null;

        send({ type: "stage", stage: "processing" });

        const deadline = Date.now() + ACTIVATE_TIMEOUT_MS;
        const processingBegan = performance.now();
        let polls = 0;
        log("gemini-processing:start", { state: uploaded.state });
        while (uploaded.state === "PROCESSING" && Date.now() < deadline) {
          await sleep(2000);
          if (!uploaded.name) break;
          uploaded = await ai.files.get({ name: uploaded.name });
          polls++;
        }
        log("gemini-processing:end", { stageMs: Math.round(performance.now() - processingBegan), polls, state: uploaded.state });

        if (uploaded.state !== "ACTIVE" || !uploaded.uri) {
          throw new GeminiError(
            "failed",
            "That recording didn't finish processing in time. It's still in this tab — try again.",
          );
        }

        send({ type: "stage", stage: "writing" });
        const fileUri = uploaded.uri;

        let passes = 0;
        let duplicatesMerged = 0;
        const unavailableModels = new Set<string>();
        const raw = await measure("generate-and-check-script", () => generateTimedResult<RawVideoResult>(async (correction) => {
          passes++;
          log("generation:pass", { pass: passes, correction: Boolean(correction) });
          if (correction) send({ type: "stage", stage: "correcting" });
          const result = await generateJson<RawVideoResult>({
          parts: [
            {
              fileData: {
                fileUri,
                mimeType: uploaded.mimeType ?? mimeType,
              },
            },
            {
              text: [videoInstruction({ durationSeconds, rubric, preset, narrator, brief }), correction].filter(Boolean).join("\n\n"),
            },
          ],
          schema: videoScriptSchemaFor(durationSeconds),
          systemInstruction: videoSystem(preset, narrator),
          temperature: correction ? 0.1 : 0.5,
          models: [...new Set([SCRIPT_MODEL, SCRIPT_FALLBACK_MODEL])].filter(model => !unavailableModels.has(model)),
          onAttempt: (timing) => {
            if (timing.outcome === "rate-limit") unavailableModels.add(timing.model);
            log("model-attempt", { pass: passes, ...timing });
          },
          });
          const scenes = mergeCoincidentScenes(result.scenes ?? []);
          duplicatesMerged = (result.scenes?.length ?? 0) - scenes.length;
          if (duplicatesMerged) log("scene-timing:merged", { pass: passes, duplicatesMerged });
          return { ...result, scenes };
        }, durationSeconds, (details) => log("scene-timing:invalid", details)));

        const draft = sanitize(raw, durationSeconds);
        const timedScenes = draft.scenes.map((scene, index) => ({ ...scene,
          seconds: (draft.scenes[index + 1]?.startSeconds ?? durationSeconds) - scene.startSeconds,
        }));
        send({ type: "stage", stage: "context" });
        let preparation: StoryPreparation<(typeof timedScenes)[number]> | undefined;
        let writingError: string | undefined;
        try {
          preparation = await measure("prepare-descriptive-story", () => prepareDescriptiveStory(timedScenes, brief, preset, narrator, [], () => send({ type: "stage", stage: "editing" })));
        } catch {
          writingError = "The video was analyzed, but the descriptive narration did not finish. Continue below to retry writing without uploading the clip again.";
        }
        const scenes = preparation?.status === "ready" ? preparation.scenes : timedScenes.map(scene => ({ ...scene, spokenLine: "" }));
        const timingNote = duplicatesMerged ? "Scenes sharing the same video timestamp were combined. Review the combined narration against the footage before recording." : undefined;
        send({ type: "done", script: { ...draft, scenes, timingNote, questions: preparation?.status === "questions" ? preparation.questions : [], writingError } });
        log("script:ready", { passes });
      } catch (error) {
        log("request:failed", { category: error instanceof SceneTimingError ? "scene-timing" : error instanceof GeminiError ? error.code : "unexpected" });
        if (error instanceof GeminiError || error instanceof SceneTimingError) {
          send({ type: "error", error: error.message });
        } else {
          console.error("/api/video failed", error);
          send({
            type: "error",
            error: "The recording couldn't be read. It's still in this tab — try again.",
          });
        }
      } finally {
        if (uploadedName) {
          // The clip stays in the student's tab, not in the project's file storage.
          await measure("delete-gemini-file", () => ai.files.delete({ name: uploadedName! })).catch(() => undefined);
        }
        controller.close();
        log("request:finished");
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
