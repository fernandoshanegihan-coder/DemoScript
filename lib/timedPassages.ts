import { Type, type Schema } from "@google/genai";
import { narrationBudget, wordCount } from "./narrationBudget.ts";
import type { StoryScene } from "./storyFlow";

export type PassageResponse = {
  passages?: Record<string, { visualEvidence?: string; spokenWords?: string[] }>;
};

/** Array bounds constrain length structurally; prose regexes alone are unreliable. */
export function explanatorySchema(scenes: StoryScene[], indexes: number[]): Schema {
  const keys = indexes.map(index => `scene${index}`);
  return {
    type: Type.OBJECT, propertyOrdering: ["throughline", "passages"],
    properties: {
      throughline: { type: Type.STRING, description: "A short internal plan connecting the task, demonstration and payoff. Not spoken output." },
      passages: {
        type: Type.OBJECT, propertyOrdering: keys, required: keys,
        properties: Object.fromEntries(indexes.map(index => {
          const scene = scenes[index];
          const budget = narrationBudget(scene.seconds);
          return [`scene${index}`, {
            type: Type.OBJECT, propertyOrdering: ["visualEvidence", "spokenWords"],
            properties: {
              visualEvidence: { type: Type.STRING, enum: [scene.visualDescription ?? scene.caption] },
              spokenWords: {
                type: Type.ARRAY, minItems: String(budget.minWords), maxItems: String(budget.maxWords),
                items: { type: Type.STRING, pattern: "^\\S+$" },
                description: `Write one continuous, natural spoken passage as an array of ${budget.minWords}–${budget.maxWords} individual words, aiming for ${budget.targetWords}. One word per item, punctuation attached to its word. Joining with spaces must yield complete sentences explaining what happens, why it matters and how to interpret it. No list labels, numbering or filler.`,
              },
            }, required: ["visualEvidence", "spokenWords"],
          } satisfies Schema];
        })),
      },
    }, required: ["throughline", "passages"],
  };
}

export async function writeTimedPassages(
  scenes: StoryScene[],
  generate: (indexes: number[], correction: string) => Promise<PassageResponse>,
): Promise<string[]> {
  const accepted = new Map<number, string>();
  // Silent shots do not need a model response (including a zero-length array).
  scenes.forEach((scene, index) => { if (scene.seconds < 3) accepted.set(index, ""); });
  let correction = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const requested = scenes.map((_, index) => index).filter(index => !accepted.has(index));
    if (!requested.length) break;
    const result = await generate(requested, correction);
    const issues = [];
    for (const sceneIndex of requested) {
      const scene = scenes[sceneIndex];
      const passage = result?.passages?.[`scene${sceneIndex}`];
      const tokens = passage?.spokenWords;
      const validTokens = Array.isArray(tokens) && tokens.every(token => typeof token === "string" && /^\S+$/.test(token));
      const text = validTokens ? tokens.join(" ") : "";
      const words = wordCount(text);
      const budget = narrationBudget(scene.seconds);
      if (!validTokens || passage?.visualEvidence !== (scene.visualDescription ?? scene.caption) || words < budget.minWords || words > budget.maxWords) {
        issues.push({ sceneIndex, seconds: scene.seconds, words, ...budget, priorPassage: text,
          instruction: "Return individual words, one per array item, within the array bounds. Write complete grounded sentences; preserve this scene's evidence." });
      } else accepted.set(sceneIndex, text);
    }
    if (!issues.length) break;
    correction = `Repair only these rejected passages: ${JSON.stringify(issues)}. All other passages are accepted and locked: ${JSON.stringify([...accepted].map(([sceneIndex, spokenLine]) => ({ sceneIndex, spokenLine })))}. Continue their story. Expand through supported explanation, not filler; shorten without moving actions or cutting off sentences.`;
  }
  if (accepted.size !== scenes.length) throw new Error("The writer could not finish a scene accurately. Your recording and answers are saved. Please try writing again.");
  return scenes.map((_, index) => accepted.get(index)!);
}
