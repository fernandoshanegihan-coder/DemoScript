import {
  GoogleGenAI,
  ThinkingLevel,
  Type,
  type Schema,
} from "@google/genai";

/**
 * Verified against the real key (23 Oct 2026). Free-tier limits are per model
 * and per day, and they are small:
 *
 *   gemini-3.8-flash        5 rpm,  20 requests/day  — best prose, tiny quota
 *   gemini-3.5-flash-lite  10 rpm, 500 requests/day  — vision + fallback
 *
 * Reading screenshots always uses the lite model. Writing the script prefers
 * the better one and falls back when its daily quota is gone.
 */
export const ANALYSIS_MODEL =
  process.env.GEMINI_ANALYSIS_MODEL?.trim() || "gemini-3.5-flash-lite";
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

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

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
}: {
  parts: Part[];
  schema: Schema;
  systemInstruction: string;
  temperature?: number;
  models: string[];
}): Promise<T> {
  const ai = getClient();
  let lastError: unknown = null;
  let outOfQuota = false;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
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
        return JSON.parse(text) as T;
      } catch (error) {
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

export const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    analyses: {
      type: Type.ARRAY,
      description: "One entry per screenshot, in the same order as the images.",
      items: {
        type: Type.OBJECT,
        properties: {
          index: {
            type: Type.INTEGER,
            description: "The screenshot number as given in the instructions, starting at 1.",
          },
          description: {
            type: Type.STRING,
            description:
              "One sentence: what screen this is and what a person sees on it.",
          },
          elements: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Up to six short labels of UI elements actually visible.",
          },
          confident: {
            type: Type.BOOLEAN,
            description:
              "False when this image is too blurry, cropped, dark, or empty to describe honestly.",
          },
        },
        required: ["index", "description", "elements", "confident"],
      },
    },
  },
  required: ["analyses"],
};

export const scriptSchema: Schema = {
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
          shotId: { type: Type.STRING },
          actionId: { type: Type.STRING },
          spokenLine: { type: Type.STRING },
          caption: { type: Type.STRING },
          covers: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["shotId", "actionId", "spokenLine", "caption", "covers"],
      },
    },
  },
  required: ["criteria", "scenes"],
};
