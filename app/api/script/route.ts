import {
  GeminiError,
  SCRIPT_FALLBACK_MODEL,
  generateJson,
  rewriteSchemaFor,
} from "@/lib/gemini";
import { DEFAULT_PRESET, isNarrator, isPreset, narratorFor } from "@/lib/presets";
import { rewriteInstruction, videoSystem, type RewriteCriterion } from "@/lib/prompts";
import type { Preset } from "@/lib/types";
import { normalizeBrief } from "@/lib/projectBrief";
import { normalizeContextAnswers } from "@/lib/storyContext";
import { narrationBudget, wordCount } from "@/lib/narrationBudget";

export const runtime = "nodejs";

type RewriteBody = {
  brief?: unknown;
  contextAnswers?: unknown;
  beforeLine?: string;
  afterLine?: string;
  description?: string;
  note?: string;
  caption?: string;
  previousLine?: string;
  seconds?: number;
  rubric?: string;
  preset?: Preset;
  narrator?: string;
  criteria?: { id?: string; label?: string }[];
};

function failure(error: unknown): Response {
  if (error instanceof GeminiError) {
    const status = error.code === "rate-limit" ? 429 : error.code === "no-key" ? 400 : 502;
    return Response.json({ error: error.message }, { status });
  }
  console.error("/api/script failed", error);
  return Response.json(
    { error: "Something went wrong rewriting the scene. Try again." },
    { status: 500 },
  );
}

/**
 * Rewrites run on the lite model on purpose. The student may correct several
 * scenes in a row, and the good model's free quota is 20 requests a day — the
 * full script keeps that budget, single-scene corrections do not.
 */
export async function POST(request: Request) {
  let body: { rewrite?: RewriteBody };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "That request didn't arrive in one piece." }, { status: 400 });
  }

  const rewrite = body.rewrite;
  if (!rewrite || typeof rewrite !== "object") {
    return Response.json({ error: "No scene to rewrite." }, { status: 400 });
  }

  const description =
    typeof rewrite.description === "string"
      ? rewrite.description.trim().slice(0, 600)
      : "";
  const note =
    typeof rewrite.note === "string" ? rewrite.note.trim().slice(0, 1200) : "";
  const caption =
    typeof rewrite.caption === "string" ? rewrite.caption.trim().slice(0, 200) : "";

  if (!description && !note && !caption) {
    return Response.json(
      { error: "Add a note about this scene, then rewrite it." },
      { status: 400 },
    );
  }

  const criteria: RewriteCriterion[] = (
    Array.isArray(rewrite.criteria) ? rewrite.criteria : []
  )
    .filter(
      (criterion) =>
        criterion &&
        typeof criterion.id === "string" &&
        criterion.id &&
        typeof criterion.label === "string" &&
        criterion.label.trim(),
    )
    .slice(0, 6)
    .map((criterion) => ({
      id: criterion.id as string,
      label: (criterion.label as string).trim().slice(0, 80),
    }));

  const preset = isPreset(rewrite.preset) ? rewrite.preset : DEFAULT_PRESET;
  const narrator = isNarrator(rewrite.narrator)
    ? rewrite.narrator
    : narratorFor(preset);
  const seconds = Math.min(
    180,
    Math.max(0.1, Number(rewrite.seconds) || 12),
  );
  const rubric =
    typeof rewrite.rubric === "string" ? rewrite.rubric.slice(0, 6000) : "";

  try {
    let raw: { spokenLine?: string; caption?: string; covers?: string[] } = {};
    const budget = narrationBudget(seconds);
    let correction = "";
    for (let attempt = 0; attempt < 3; attempt++) {
    raw = await generateJson<{
      spokenLine?: string;
      caption?: string;
      covers?: string[];
    }>({
      parts: [
        {
          text: rewriteInstruction({
            description,
            note,
            caption,
            previousLine:
              typeof rewrite.previousLine === "string"
                ? rewrite.previousLine.trim().slice(0, 800)
                : "",
            seconds,
            rubric,
            criteria,
            narrator,
            brief: normalizeBrief(rewrite.brief),
            contextAnswers: normalizeContextAnswers(rewrite.contextAnswers),
            beforeLine: typeof rewrite.beforeLine === "string" ? rewrite.beforeLine.slice(0, 1500) : "",
            afterLine: typeof rewrite.afterLine === "string" ? rewrite.afterLine.slice(0, 1500) : "",
          }) + correction,
        },
      ],
      schema: rewriteSchemaFor(seconds),
      systemInstruction: videoSystem(preset, narrator),
      temperature: 0.6,
      models: [SCRIPT_FALLBACK_MODEL],
    });
    const count = wordCount(typeof raw.spokenLine === "string" ? raw.spokenLine : "");
    if (count >= budget.minWords && count <= budget.maxWords) break;
    if (attempt === 2) throw new GeminiError("failed", "That explanation still does not fit the scene. Your previous line is kept. Add a more specific rewrite note or use Expand explanations for follow-up questions.");
    correction = `\nThe last line had ${count} words. Write ${budget.minWords}–${budget.maxWords} grounded words for this ${seconds}-second scene. Explain the meaning and purpose, without filler or invented facts.`;
    }

    const spokenLine =
      typeof raw.spokenLine === "string" ? raw.spokenLine.trim() : "";
    if (!spokenLine && seconds >= 3) {
      throw new GeminiError("failed", "Gemini didn't rewrite that scene. Try again.");
    }

    const allowed = new Set(criteria.map((criterion) => criterion.id));
    const covers = Array.isArray(raw.covers)
      ? raw.covers.filter(
          (id): id is string => typeof id === "string" && allowed.has(id),
        )
      : [];

    return Response.json({
      spokenLine,
      caption: typeof raw.caption === "string" ? raw.caption.trim() : "",
      covers: [...new Set(covers)],
    });
  } catch (error) {
    return failure(error);
  }
}
