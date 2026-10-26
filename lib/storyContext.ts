import type { Criterion, Scene } from "./types";

export type StoryQuestion = { id: string; sceneIndex: number; question: string };
export type ContextAnswer = { question: string; answer: string };
export type PendingStory = {
  scenes: Scene[];
  criteria: Criterion[];
  questions: StoryQuestion[];
  answers: Record<string, string>;
  contextAnswers: ContextAnswer[];
  writingError?: string;
};

export function normalizeContextAnswers(value: unknown): ContextAnswer[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-9).flatMap(item => {
    if (!item || typeof item.question !== "string" || typeof item.answer !== "string") return [];
    const question = item.question.trim().slice(0, 600);
    const answer = item.answer.trim().slice(0, 1800);
    return question && answer ? [{ question, answer }] : [];
  });
}

export function normalizeStoryQuestions(value: unknown, sceneCount: number): StoryQuestion[] {
  if (!Array.isArray(value)) throw new Error("The context check did not finish. Your script has not been replaced.");
  const questions: StoryQuestion[] = [];
  const seen = new Set<string>();
  for (const item of value.slice(0, 3)) {
    if (!item || typeof item.question !== "string" || !item.question.trim() || !Number.isInteger(item.sceneIndex) || item.sceneIndex < 0 || item.sceneIndex >= sceneCount) throw new Error("The context check returned an invalid question. Your script has not been replaced.");
    const question = item.question.trim().slice(0, 600);
    if (seen.has(question.toLowerCase())) continue;
    seen.add(question.toLowerCase());
    questions.push({ id: `q${questions.length + 1}`, sceneIndex: item.sceneIndex, question });
  }
  return questions;
}
