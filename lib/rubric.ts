/**
 * Find a required duration in a rubric, in minutes. Deliberately small: a few
 * patterns for the ways a hackathon actually states a limit. Prose like "keep
 * it brief" is not a number, and should not be guessed at.
 */
export function detectTimeLimit(text: string): number | null {
  if (!text.trim()) return null;
  const clean = text.toLowerCase();

  // "2–3 minutes", "between 2 and 3 minutes": the upper bound is the limit.
  const range = clean.match(
    /(\d{1,2})\s*(?:-|–|to|and)\s*(\d{1,2})\s*(?:minutes?|mins?)\b/,
  );
  if (range) return sane(Number(range[2]));

  // "2:30"
  const clock = clean.match(/\b(\d{1,2}):([0-5]\d)\b/);
  if (clock) return sane(Number(clock[1]) + Number(clock[2]) / 60);

  // "3 minute demo", "5 min including Q&A"
  const minutes = clean.match(/(\d{1,2}(?:\.5)?)\s*(?:minutes?|mins?)\b/);
  if (minutes) return sane(Number(minutes[1]));

  // "180 seconds"
  const seconds = clean.match(/(\d{1,3})\s*(?:seconds?|secs?)\b/);
  if (seconds) return sane(Number(seconds[1]) / 60);

  return null;
}

function sane(minutes: number): number | null {
  if (!Number.isFinite(minutes)) return null;
  if (minutes < 0.5 || minutes > 30) return null;
  return minutes;
}
