import { GeminiError } from "@/lib/gemini";
import { normalizeBrief } from "@/lib/projectBrief";
import { DEFAULT_PRESET, isNarrator, isPreset, narratorFor } from "@/lib/presets";
import { prepareDescriptiveStory } from "@/lib/storyEditor";
import { normalizeContextAnswers } from "@/lib/storyContext";
import type { StoryScene } from "@/lib/storyFlow";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "The script could not be read." }, { status: 400 }); }
  const raw = body?.scenes;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 40) return Response.json({ error: "Provide a script with 1–40 scenes." }, { status: 400 });
  let previousEnd = 0;
  const scenes: StoryScene[] = [];
  for (const scene of raw) {
    if (!scene || typeof scene.spokenLine !== "string" || typeof scene.caption !== "string" ||
        !Number.isFinite(scene.startSeconds) || !Number.isFinite(scene.seconds) || scene.startSeconds < previousEnd - 0.001 ||
        scene.seconds <= 0 || scene.startSeconds + scene.seconds > 180.5) {
      return Response.json({ error: "The script has invalid scene timing. Your current script is unchanged." }, { status: 400 });
    }
    scenes.push({ startSeconds: scene.startSeconds, seconds: scene.seconds, spokenLine: scene.spokenLine.slice(0, 4000), caption: scene.caption.slice(0, 300), visualDescription: typeof scene.visualDescription === "string" ? scene.visualDescription.slice(0, 2000) : undefined });
    previousEnd = scene.startSeconds + scene.seconds;
  }
  const preset = isPreset(body.preset) ? body.preset : DEFAULT_PRESET;
  const narrator = isNarrator(body.narrator) ? body.narrator : narratorFor(preset);
  try {
    const result = await prepareDescriptiveStory(scenes, normalizeBrief(body.brief), preset, narrator, normalizeContextAnswers(body.contextAnswers));
    if (result.status === "questions") return Response.json({ questions: result.questions });
    return Response.json({ lines: result.scenes.map(scene => scene.spokenLine) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Story editing failed. Your current script is unchanged." }, { status: error instanceof GeminiError && error.code === "rate-limit" ? 429 : 502 });
  }
}
