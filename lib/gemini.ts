import {
  GoogleGenAI,
  ThinkingLevel,
  Type,
  type Schema,
} from "@google/genai";
import { narrationPattern } from "./narrationBudget.ts";

/**
 * Verified against the real key (23 Oct 2026). Free-tier limits are per model
 * and per day, and they are small:
 *
 *   gemini-3.8-flash        5 rpm,  20 requests/day  — best prose, tiny quota
 *   gemini-3.5-flash-lite  10 rpm, 500 requests/day  — rewriting + fallback
 *
 * Writing the script prefers the better model and falls back when its daily
 * quota is gone. Single-scene rewrites stay on the cheap model.
 */
export const SCRIPT_MODEL =
  process.env.GEMINI_SCRIPT_MODEL?.trim() || "gemini-3.8-flash";
export const SCRIPT_FALLBACK_MODEL = "gemini-3.5-flash-lite";

export type GeminiFailure = "no-key" | "rate-limit" | "failed";

export class GeminiError extends Error {
  code: GeminiFailure;

  constructor(code: GeminiFailure, message: string) {
    super(message);
    this.code = code;
  }
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiError(
      "no-key",
      "Gemini isn't set up yet — add GEMINI_API_KEY to .env.local and restart the server.",
    );
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

/** Files API calls need the same client; the key still never leaves the server. */
export function getGeminiClient(): GoogleGenAI {
  return getClient();
}

type Part =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { fileData: { fileUri: string; mimeType: string } };

export type ModelAttemptTiming = {
  model: string;
  attempt: number;
  milliseconds: number;
  outcome: "success" | "rate-limit" | "error";
};

function isRateLimit(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = (error as { status?: number }).status;
  if (status === 429) return true;
  const message = error instanceof Error ? error.message : String(error);
  return /RESOURCE_EXHAUSTED|rate.?limit|quota/i.test(message);
}

/**
 * One structured call per model, one retry each. The schema is what makes the
 * retry worth it: the model always answers in the same shape, so a second
 * attempt is cheap. When a model is out of free quota, the next one takes over
 * instead of making the student wait for midnight.
 */
export async function generateJson<T>({
  parts,
  schema,
  systemInstruction,
  temperature = 0.2,
  models,
  onAttempt,
}: {
  parts: Part[];
  schema: Schema;
  systemInstruction: string;
  temperature?: number;
  models: string[];
  onAttempt?: (timing: ModelAttemptTiming) => void;
}): Promise<T> {
  const ai = getClient();
  let lastError: unknown = null;
  let outOfQuota = false;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const began = performance.now();
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts }],
          config: {
            systemInstruction,
            temperature,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        });
        const text = response.text;
        if (!text) throw new Error("Empty response");
        const parsed = JSON.parse(text) as T;
        onAttempt?.({ model, attempt: attempt + 1, milliseconds: Math.round(performance.now() - began), outcome: "success" });
        return parsed;
      } catch (error) {
        onAttempt?.({ model, attempt: attempt + 1, milliseconds: Math.round(performance.now() - began), outcome: isRateLimit(error) ? "rate-limit" : "error" });
        if (isRateLimit(error)) {
          outOfQuota = true;
          break;
        }
        lastError = error;
      }
    }
  }

  if (outOfQuota) {
    throw new GeminiError(
      "rate-limit",
      "Gemini's free quota is used up for now — try again in a minute, or after midnight Pacific if it keeps happening.",
    );
  }

  const detail = lastError instanceof Error ? lastError.message : "";
  throw new GeminiError(
    "failed",
    detail
      ? `Gemini didn't answer cleanly. ${detail.slice(0, 140)}`
      : "Gemini didn't answer. Your screenshots are still here — try again.",
  );
}

export const rewriteSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    spokenLine: { type: Type.STRING },
    caption: { type: Type.STRING },
    covers: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["spokenLine", "caption", "covers"],
};

export function rewriteSchemaFor(seconds: number): Schema {
  return { ...rewriteSchema, properties: { ...rewriteSchema.properties,
    spokenLine: { type: Type.STRING, pattern: narrationPattern(seconds) },
  } };
}

export const videoScriptSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    criteria: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          label: { type: Type.STRING },
          source: { type: Type.STRING },
        },
        required: ["id", "label", "source"],
      },
    },
    scenes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          startSeconds: {
            type: Type.NUMBER,
            description:
              "The second in the recording where this scene begins. 0 for the first, increasing afterwards.",
          },
          visualDescription: { type: Type.STRING, description: "Only the actions and states visibly observed during this exact scene interval." },
          spokenLine: {
            type: Type.STRING,
            description:
              "What the viewer hears over this scene. No more words than the scene's seconds × 2.4, rounded down.",
          },
          caption: { type: Type.STRING },
          covers: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["startSeconds", "visualDescription", "spokenLine", "caption", "covers"],
      },
    },
  },
  required: ["criteria", "scenes"],
};

/** Enforce bounds at generation, rather than relying only on prose instructions. */
export function videoScriptSchemaFor(durationSeconds: number): Schema {
  const scenes = videoScriptSchema.properties!.scenes;
  const item = scenes.items!;
  return {
    ...videoScriptSchema,
    properties: {
      ...videoScriptSchema.properties,
      scenes: {
        ...scenes,
        minItems: "1",
        items: {
          ...item,
          properties: {
            ...item.properties,
            startSeconds: {
              ...item.properties!.startSeconds,
              minimum: 0,
              maximum: Math.max(0, durationSeconds - 0.001),
            },
          },
        },
      },
    },
  };
}
