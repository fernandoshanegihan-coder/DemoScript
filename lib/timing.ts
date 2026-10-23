export const WORDS_PER_SECOND = 2.5;

/** Rough spoken length of a line. Deliberately simple: words in, seconds out. */
export function secondsFor(line: string): number {
  const words = line.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(words / WORDS_PER_SECOND);
}

export function totalSeconds(lines: string[]): number {
  return lines.reduce((sum, line) => sum + secondsFor(line), 0);
}

/** 161 -> "2:41" */
export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}
