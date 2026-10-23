import {
  GeminiError,
  SCRIPT_FALLBACK_MODEL,
  SCRIPT_MODEL,
  generateJson,
  scriptSchema,
} from "@/lib/gemini";
import { normalizeCriteria } from "@/lib/criteria";
import { scriptInstruction, scriptSystem, type ScriptShot } from "@/lib/prompts";
import type { ScriptResult, ScriptScene, Tone } from "@/lib/types";

export const runtime = "nodejs";

type RawScene = {
  shotId: string;
  actionId: string;
  spokenLine: string;
  caption: string;
  covers: string[];
};
type RawResult = { criteria: { id: string; label: string; source: string }[]; scenes: RawScene[] };

const TONES: Tone[] = ["professional", "energetic", "storytelling"];
const MAX_SHOTS = 18;

function sanitize(raw: RawResult, shotIds: Set<string>): ScriptResult {
  const { criteria, idFor } = normalizeCriteria(raw.criteria);

  const scenes: ScriptScene[] = [];
  for (const scene of raw.scenes ?? []) {
    const shotId = typeof scene.shotId === "string" ? scene.shotId : "";
    const spokenLine = typeof scene.spokenLine === "string" ? scene.spokenLine.trim() : "";
    if (!shotIds.has(shotId) || !spokenLine) continue;

    const covers = Array.isArray(scene.covers)
      ? scene.covers
          .map((ref) => idFor(String(ref)))
          .filter((id): id is string => Boolean(id))
      : [];

    scenes.push({
      shotId,
      actionId: typeof scene.actionId === "string" && scene.actionId !== "(whole screen)"
        ? scene.actionId
        : "",
      spokenLine,
      caption: typeof scene.caption === "string" ? scene.caption.trim() : "",
      covers: [...new Set(covers)],
    });
  }

  if (scenes.length === 0) {
    throw new GeminiError(
      "failed",
      "Gemini didn't write any scenes. Your screenshots are still here — try again.",
    );
  }

  return { criteria, scenes };
}

function failure(error: unknown): Response {
  if (error instanceof GeminiError) {
    const status = error.code === "rate-limit" ? 429 : error.code === "no-key" ? 400 : 502;
    return Response.json({ error: error.message }, { status });
  }
  console.error("/api/script failed", error);
  return Response.json(
    { error: "Something went wrong writing the script. Try again." },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  let body: {
    shots?: ScriptShot[];
    rubric?: string;
    tone?: Tone;
    minutes?: number;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "That request didn't arrive in one piece." }, { status: 400 });
  }

  const shots = (Array.isArray(body.shots) ? body.shots : [])
    .filter((shot) => shot && typeof shot.shotId === "string" && shot.shotId)
    .slice(0, MAX_SHOTS)
    .map((shot) => ({
      shotId: shot.shotId,
      actionId: typeof shot.actionId === "string" ? shot.actionId : "",
      description: typeof shot.description === "string" ? shot.description.slice(0, 600) : "",
      note: typeof shot.note === "string" ? shot.note.slice(0, 1200) : "",
    }));

  if (shots.length === 0) {
    return Response.json({ error: "No screenshots to write from." }, { status: 400 });
  }

  const tone = TONES.includes(body.tone as Tone) ? (body.tone as Tone) : "professional";
  const minutes = Math.min(3, Math.max(1, Math.round(Number(body.minutes) || 2)));
  const rubric = typeof body.rubric === "string" ? body.rubric.slice(0, 6000) : "";
  const seconds = minutes * 60;

  try {
    const raw = await generateJson<RawResult>({
      parts: [{ text: scriptInstruction({ shots, rubric, tone, seconds }) }],
      schema: scriptSchema,
      systemInstruction: scriptSystem(tone),
      temperature: 0.6,
      models: [SCRIPT_MODEL, SCRIPT_FALLBACK_MODEL],
    });

    return Response.json(sanitize(raw, new Set(shots.map((shot) => shot.shotId))));
  } catch (error) {
    return failure(error);
  }
}
