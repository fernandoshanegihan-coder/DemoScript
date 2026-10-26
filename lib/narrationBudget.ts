/** Most of the slot is spoken; the remainder allows breathing and transitions. */
export function narrationBudget(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 3) return { minWords: 0, targetWords: 0, maxWords: 0 };
  return {
    minWords: Math.floor(seconds * 1.8),
    targetWords: Math.floor(seconds * 2.1),
    maxWords: Math.floor(seconds * 2.4),
  };
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function narrationPattern(seconds: number): string {
  const { minWords, maxWords } = narrationBudget(seconds);
  return maxWords === 0 ? "^$" : `^\\S+(?:\\s+\\S+){${minWords - 1},${maxWords - 1}}$`;
}
