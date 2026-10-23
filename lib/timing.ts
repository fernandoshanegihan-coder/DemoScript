export const WORDS_PER_SECOND = 2.5;

/** Rough spoken length of a line. Deliberately simple: words in, seconds out. */
export function secondsFor(line: string): number {
  const words = line.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(words / WORDS_PER_SECOND);
}

export function totalSeconds(lines: string[]): number {
  return lines.reduce((sum, line) => sum + secondsFor(line), 0);
}

/**
 * Which scene should be on screen at `elapsed`, given each scene's spoken
 * length in order. Past the last scene, the last one stays up — the read can
 * run over without the page losing its place.
 */
export function sceneIndexAt(durations: number[], elapsed: number): number {
  if (durations.length === 0) return -1;
  let end = 0;
  for (let index = 0; index < durations.length; index += 1) {
    end += Math.max(0, durations[index]);
    if (elapsed < end) return index;
  }
  return durations.length - 1;
}

/** What the rehearsal says when it stops. Plain, and never a score. */
export function rehearsalSummary(elapsed: number, planned: number): string {
  const read = Math.max(0, Math.round(elapsed));
  const whole = Math.max(0, Math.round(planned));

  if (read === 0) return "The clock stopped before you started.";
  if (read < whole) {
    return `You stopped at ${formatClock(read)} of ${formatClock(whole)} — ${formatClock(whole - read)} left.`;
  }
  if (read === whole) {
    return `You read the whole ${formatClock(whole)} — right at your limit.`;
  }
  return `You read ${formatClock(read)} against ${formatClock(whole)} — ${formatClock(read - whole)} over.`;
}

/** 161 -> "2:41" */
export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}
