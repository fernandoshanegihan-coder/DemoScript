import { generateJson, SCRIPT_FALLBACK_MODEL } from "@/lib/gemini";
import { applyStoryLines, storyFlowInstruction, type StoryScene } from "@/lib/storyFlow";
import { explanatorySchema, writeTimedPassages, type PassageResponse } from "@/lib/timedPassages";
import { presetById } from "@/lib/presets";
import { assessStoryContext } from "@/lib/storyPlanner";
import type { ContextAnswer, StoryQuestion } from "@/lib/storyContext";
import type { ProjectBrief } from "@/lib/projectBrief";
import type { Narrator, Preset } from "@/lib/types";

export async function polishStory<T extends StoryScene>(scenes: T[], brief: ProjectBrief, preset: Preset, narrator: Narrator, contextAnswers: ContextAnswer[] = []): Promise<T[]> {
  const lines = await writeTimedPassages(scenes, async (requested, correction) => {
    return generateJson<PassageResponse>({
      parts: [{ text: [storyFlowInstruction(scenes, brief, contextAnswers), correction,
        `Return complete read-aloud passages for these keys: ${requested.map(index => `passages.scene${index}`).join(", ")}. Return each spoken passage in spokenWords as individual words, with punctuation attached. Joining the array with spaces must produce normal read-aloud prose. Respect the array length bounds. The throughline is only an internal plan; never substitute a plan or summary for spoken passages.`,
      ].filter(Boolean).join("\n\n") }],
      schema: explanatorySchema(scenes, requested),
      systemInstruction: [
        "Write a descriptive presenter script for any recording domain. Explain throughout each scene with short natural pauses. Use complete spoken sentences, causal links and concrete interpretations, not a short overview or feature list.",
        `Audience: ${presetById(preset).label}. Presenter speaks as ${narrator === "we" ? "we, a team" : "I, a solo builder"}.`,
        "Use only supplied observations, project context and follow-up answers. Do not invent features, authorship, results, implementation details or metrics. Explain supported context and implications without generic filler.",
        "Reach the word range through explanation, not padding. Explain the relationship between visible inputs and outputs, what a value or choice means, why that step is useful, and what decision follows. Avoid empty adverbs such as conveniently, smoothly, instantly, thoroughly or seamlessly.",
        "Each scene is fixed in time. Never move an action or result to a different scene. Keep its visual evidence. Write a paragraph for a long meaningful scene, respecting its minimum and maximum word counts.",
        "No greeting, hype, thanks, grading claims or unsupported future work. End the last narratable scene by connecting the visible work to the user's goal.",
      ].join("\n"),
      temperature: 0.4, models: [SCRIPT_FALLBACK_MODEL],
    });
  });
  return applyStoryLines(scenes, lines.map((spokenLine, sceneIndex) => ({ sceneIndex, spokenLine })), true);
}

export type StoryPreparation<T> = { status: "questions"; questions: StoryQuestion[] } | { status: "ready"; scenes: T[] };

export async function prepareDescriptiveStory<T extends StoryScene>(scenes: T[], brief: ProjectBrief, preset: Preset, narrator: Narrator, answers: ContextAnswer[] = [], onWriting?: () => void): Promise<StoryPreparation<T>> {
  if (scenes.every(scene => scene.seconds < 3)) return { status: "ready", scenes: scenes.map(scene => ({ ...scene, spokenLine: "" })) };
  const questions = await assessStoryContext(scenes, brief, answers);
  if (questions.length) return { status: "questions", questions };
  onWriting?.();
  return { status: "ready", scenes: await polishStory(scenes, brief, preset, narrator, answers) };
}
