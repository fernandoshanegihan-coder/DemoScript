import type { Tone } from "@/lib/types";

export const ANALYSIS_SYSTEM = [
  "You read product screenshots for a student writing a short demo video script.",
  "Describe only what is visibly on the screen. Never guess at features, labels, or data that you cannot read.",
  "Set confident to false when the image is too blurry, too cropped, too dark, or too empty to describe honestly — that is a valid answer, not a failure.",
].join(" ");

export function analysisInstruction(count: number): string {
  return [
    `You will see ${count} screenshot${count === 1 ? "" : "s"} from a student's own project, in demo order.`,
    "Return one entry in analyses for each screenshot, in the same order, with index matching the screenshot number (1 to N).",
    "For each one, description is one plain sentence saying what screen it is and what a viewer would notice first.",
    "elements is up to six short labels of UI elements you can actually read (buttons, headings, menu items, field labels).",
    "Leave out anything you cannot see. If you would be guessing about a screenshot, set that entry's confident to false — that is a valid answer, not a failure.",
  ].join("\n");
}

const TONE_NOTES: Record<Tone, string> = {
  professional:
    "Calm and direct. Short declarative sentences. No exclamation marks, no hype words, no jokes.",
  energetic:
    "Bright and fast-moving. Short sentences with momentum. Enthusiasm comes from specifics, not adjectives. At most one exclamation mark in the whole script.",
  storytelling:
    "Warm and human. Start from the moment the user was stuck, then show what changed. Concrete details over adjectives.",
};

export type ScriptShot = {
  shotId: string;
  actionId: string;
  description: string;
  note: string;
};

export function scriptSystem(tone: Tone): string {
  return [
    "You write demo-video scripts that a student will read out loud while recording their screen.",
    "The spoken line is what they say; the caption is what appears on screen.",
    "Write the way a person talks, not the way a landing page reads.",
    "Never invent a feature that is not in the supplied descriptions or notes.",
    `Tone: ${TONE_NOTES[tone]}`,
  ].join(" ");
}

export function scriptInstruction({
  shots,
  rubric,
  tone,
  seconds,
}: {
  shots: ScriptShot[];
  rubric: string;
  tone: Tone;
  seconds: number;
}): string {
  const targetWords = Math.round(seconds * 2.5);
  const sceneTarget = Math.max(3, Math.round(seconds / 15));

  const shotBlock = shots
    .map((shot) => {
      const lines = [
        `- shotId: ${shot.shotId}`,
        `  actionId: ${shot.actionId || "(whole screen)"}`,
        `  what the screen shows: ${shot.description || "(the student says this screen could not be read)"}`,
      ];
      if (shot.note.trim()) lines.push(`  the student's own note: ${shot.note.trim()}`);
      return lines.join("\n");
    })
    .join("\n");

  const rubricBlock = rubric.trim()
    ? [
        "The student's judging criteria, copied exactly as they gave them:",
        rubric.trim(),
        "",
        "Split them into 2–6 criteria. Use the student's own wording in source; keep label short (under 8 words).",
        "Only mark a scene as covering a criterion when that scene genuinely shows evidence for it. An empty covers list is fine and normal.",
      ].join("\n")
    : "The student gave no judging criteria. Return an empty criteria list, and an empty covers list on every scene.";

  return [
    `Write the script for a ${Math.round(seconds / 60)}-minute demo video, in ${tone} tone.`,
    `The whole thing is about ${targetWords} spoken words — roughly ${Math.round(targetWords * 0.85)} to ${Math.round(targetWords * 1.15)} words across all scenes.`,
    "",
    "Screenshots, in the order they will appear:",
    shotBlock,
    "",
    "Rules:",
    `- Use every screenshot at least once, in the order given, and aim for about ${sceneTarget} scenes (one per 15 seconds of video). If there are fewer screenshots than scenes, reuse a screenshot in a later scene rather than stretching one scene to fill the time — a one-page project is normal, and several scenes can come from the same frame.`,
    "- If a screenshot has several actions, one scene per action, using that action's actionId.",
    "- Spoken line: 25–40 words (roughly 10–16 seconds at reading speed), first person, present tense. Say what the viewer is looking at and why it matters. No 'as you can see', no 'welcome to my demo', no feature list.",
    "- Caption: at most 8 words, sentence case, describing the visual, not repeating the spoken line.",
    "- The first scene should land the problem or the promise in one sentence. The last scene should close on what the user can now do.",
    "- Never pad with filler. If the material genuinely cannot fill the time, write fewer scenes and let the clock come up short.",
    "",
    rubricBlock,
  ].join("\n");
}
