/**
 * Confirms which Gemini models your key can actually use, and what the free
 * tier allows. Run it before trusting the app's model names:
 *
 *   node --env-file=.env.local scripts/check-model.mjs
 *
 * Free tier (verified 23 Oct 2026, per model, per project):
 *   gemini-3.8-flash        5 rpm,  20 requests/day
 *   gemini-3.5-flash-lite  10 rpm, 500 requests/day
 */
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("No GEMINI_API_KEY found. Put it in .env.local in the project root.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const candidates = [
  process.env.GEMINI_ANALYSIS_MODEL,
  process.env.GEMINI_SCRIPT_MODEL,
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
].filter(Boolean);

for (const model of [...new Set(candidates)]) {
  try {
    const response = await ai.models.generateContent({
      model,
      contents: "Reply with the single word: ready",
      config: { temperature: 0, maxOutputTokens: 512, thinkingConfig: { thinkingLevel: "minimal" } },
    });
    console.log(`OK   ${model} -> "${(response.text ?? "").trim()}"`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const limit = message.match(/limit: (\d+)/)?.[1];
    const retry = message.match(/Please retry in ([^.]+)\./)?.[1];
    console.log(
      `FAIL ${model} -> ${limit ? `daily quota ${limit}` : message.slice(0, 120)}${retry ? ` (retry in ${retry.trim()})` : ""}`,
    );
  }
}
