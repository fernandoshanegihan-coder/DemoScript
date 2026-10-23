export const CUT_SECONDS = 15;
export const CUT_SHARE = 0.2;

/**
 * A scene earns a cut flag when it is long — over 15 seconds, or over a fifth
 * of the clock — and proves no criterion. It is advice, not enforcement: the
 * student can keep the scene, and the script stays theirs.
 */
export function cutNote(
  seconds: number,
  covers: string[],
  limitSeconds: number,
): string | null {
  if (covers.length > 0) return null;

  const longByTime = seconds > CUT_SECONDS;
  const longByShare = seconds > Math.max(1, limitSeconds) * CUT_SHARE;
  if (!longByTime && !longByShare) return null;

  return `Cut this: ${Math.round(seconds)} seconds, and it proves no criterion.`;
}
