import type { SceneTake, TakeSource, TakeStatus } from "@/lib/types";

/** Reading pace a demo narration should sit in. */
export const WPM_MIN = 110;
export const WPM_MAX = 180;

/** Any take past the scene boundary is too long for aligned export. */
export const TOO_LONG_RATIO = 1;
/** Under half the target is "too short". */
export const TOO_SHORT_RATIO = 0.5;

export function wordsIn(line: string): number {
  return line.trim().split(/\s+/).filter(Boolean).length;
}

/** Words per minute for a take, or null when it cannot be measured. */
export function computeWpm(line: string, seconds: number | null): number | null {
  const words = wordsIn(line);
  if (!seconds || seconds <= 0 || words === 0) return null;
  return Math.round((words / seconds) * 60);
}

export function isWpmOutOfRange(wpm: number | null): boolean {
  return wpm !== null && (wpm < WPM_MIN || wpm > WPM_MAX);
}

export function computeTakeStatus(
  seconds: number | null,
  targetSeconds: number,
): TakeStatus {
  if (!seconds || seconds <= 0) return "empty";
  const target = Math.max(1, targetSeconds);
  if (seconds > target * TOO_LONG_RATIO) return "too-long";
  if (seconds < target * TOO_SHORT_RATIO) return "too-short";
  return "recorded";
}

export function emptyTake(source: TakeSource = "voice"): SceneTake {
  return {
    blob: null,
    durationSeconds: null,
    source,
    status: "empty",
    wpm: null,
    wpmOutOfRange: false,
  };
}

/** Build the take the app stores after a recording or a synthesis finishes. */
export function takeFrom(
  blob: Blob,
  seconds: number,
  source: TakeSource,
  spokenLine: string,
  targetSeconds: number,
): SceneTake {
  const wpm = computeWpm(spokenLine, seconds);
  return {
    blob,
    spokenLine,
    durationSeconds: seconds,
    source,
    status: computeTakeStatus(seconds, targetSeconds),
    wpm,
    wpmOutOfRange: isWpmOutOfRange(wpm),
  };
}

export const TAKE_STATUS_LABEL: Record<TakeStatus, string> = {
  empty: "Empty",
  recorded: "Recorded",
  "too-long": "Too long",
  "too-short": "Too short",
};
