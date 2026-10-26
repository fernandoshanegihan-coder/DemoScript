import type { Narrator, Preset } from "@/lib/types";

export const PRESETS: {
  id: Preset;
  label: string;
  blurb: string;
  /** Fed to both the script and the recording pass. */
  guide: string;
  /** How that demo is usually presented: a team, or one person. */
  narrator: Narrator;
}[] = [
  {
    id: "hackathon",
    label: "Hackathon",
    blurb: "Judges with three minutes and a scorecard.",
    narrator: "we",
    guide: [
      "A hackathon demo, judged by people who have already seen twenty other projects today.",
      "Open on the working product, not on slides or the team. Lead with what the user can do now.",
      "Demonstrate relevant judging criteria through concrete evidence. Do not announce that the app meets criteria, has technical difficulty, or deserves marks.",
      "One end-to-end flow beats five half-shown features. Close on the demonstrated benefit; mention future work only when the creator supplied it.",
      "No business model, no market size, no team bios unless the rubric asks for them.",
    ].join(" "),
  },
  {
    id: "university",
    label: "University project",
    blurb: "A supervisor and markers grading the build.",
    narrator: "i",
    guide: [
      "An assessed university project demo, watched by a supervisor and markers who will grade it against a rubric.",
      "Open with the problem and why it mattered, then show the system working end to end.",
      "Explain one or two engineering decisions plainly — the data model, the algorithm, the trade-off you chose — because that is what the marks are for.",
      "Be precise about scope: say what works, what is deliberately out of scope, and what you would do with more time.",
      "Calm and exact. No marketing adjectives, no jokes, no exclamation marks.",
    ].join(" "),
  },
  {
    id: "client-pitch",
    label: "Client pitch",
    blurb: "A prospect deciding whether this is worth buying.",
    narrator: "i",
    guide: [
      "A pitch to a prospective customer who is deciding whether this is worth paying for.",
      "Open on their pain in their own words, then show the exact workflow they would use on a normal day.",
      "Name the outcome, not the features: hours saved, steps removed, mistakes avoided. Use the numbers visible on screen and never invent new ones.",
      "Close on the smallest next step they could take, such as a trial with their own data.",
      "Warm and confident, second person where it helps. No internal jargon, no architecture tour.",
    ].join(" "),
  },
  {
    id: "portfolio",
    label: "Portfolio",
    blurb: "A showreel for future employers.",
    narrator: "i",
    guide: [
      "A portfolio showreel for a future employer or collaborator skimming your work.",
      "Open with what the product does in one sentence, then show the craft: the interaction, the edge cases, the parts that took judgement.",
      "Name one trade-off you chose and why. That is the part an interviewer remembers.",
      "Keep it short and confident. No life story, no team credits, no invented metrics.",
      "Plain, first person, present tense.",
    ].join(" "),
  },
];

export const DEFAULT_PRESET: Preset = "hackathon";

export function isPreset(value: unknown): value is Preset {
  return PRESETS.some((preset) => preset.id === value);
}

export function presetById(id: Preset) {
  return PRESETS.find((preset) => preset.id === id) ?? PRESETS[0];
}

/** The pronoun a demo type usually wants, before the student changes it. */
export function narratorFor(id: Preset): Narrator {
  return presetById(id).narrator;
}

export function isNarrator(value: unknown): value is Narrator {
  return value === "i" || value === "we";
}
