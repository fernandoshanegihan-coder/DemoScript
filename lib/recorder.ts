export const MAX_RECORDING_SECONDS = 180;

export type RecordingResult = {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
  posterDataUrl: string;
  createdAt: number;
};

export type RecordingSession = {
  stop: () => void;
  pause: () => void;
  resume: () => void;
  elapsed: () => number;
  paused: () => boolean;
};

type StartOptions = {
  onTick: (elapsedSeconds: number, paused: boolean) => void;
  onFinish: (result: RecordingResult) => void;
};

/**
 * Time the file will actually contain. Paused stretches are simply not counted,
 * so a nervous setup break never eats the three-minute budget.
 */
export function recordedSeconds(
  recordedMs: number,
  segmentStartedAt: number | null,
  now: number = Date.now(),
): number {
  const live =
    segmentStartedAt === null ? 0 : Math.max(0, now - segmentStartedAt);
  return Math.min(MAX_RECORDING_SECONDS, (recordedMs + live) / 1000);
}

export function canRecordScreen(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function" &&
    typeof MediaRecorder !== "undefined"
  );
}

/**
 * Chrome records VP9 happily; Safari only does MP4 in recent versions. Try the
 * preferred codecs in order and let the browser pick if none are advertised —
 * a recording in the wrong container is better than no recording.
 */
function preferredMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

/**
 * A still from the recording, used as its poster frame. Best effort: a missing
 * poster only costs a blank rectangle in the input column.
 */
async function posterFor(blob: Blob, durationSeconds: number): Promise<string> {
  const url = URL.createObjectURL(blob);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("poster timeout")), 4000);
      video.onloadeddata = () => {
        clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timer);
        reject(new Error("poster failed"));
      };
    });

    video.currentTime = Math.min(0.2, Math.max(0, durationSeconds / 2));
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 1500);
      video.onseeked = () => {
        clearTimeout(timer);
        resolve();
      };
    });

    const width = 320;
    const height = Math.round((video.videoHeight / video.videoWidth) * width) || 180;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return "";
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Starts a picture-only screen recording. There is no microphone track on
 * purpose: the user's own voice is added afterwards, over the clip, so one
 * voice is audible at a time. Pausing cuts the paused stretch from the file.
 *
 * `onFinish` fires exactly once — on Stop, at the three-minute limit of
 * recorded footage, or when the user ends sharing from the browser's own bar.
 */
export async function beginRecording({
  onTick,
  onFinish,
}: StartOptions): Promise<RecordingSession> {
  if (!canRecordScreen()) {
    throw new Error(
      "This browser can't record the screen — use Chrome, or drop screenshots instead.",
    );
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: false,
    });
  } catch {
    throw new Error(
      "Screen recording was blocked or cancelled. Allow this tab to share a screen, or drop screenshots instead.",
    );
  }

  const mimeType = preferredMimeType();
  const recorder = new MediaRecorder(
    stream,
    mimeType
      ? { mimeType, videoBitsPerSecond: 2_500_000 }
      : { videoBitsPerSecond: 2_500_000 },
  );

  const chunks: Blob[] = [];
  let finished = false;
  let paused = false;
  let recordedMs = 0;
  let segmentStartedAt: number | null = Date.now();

  const elapsed = () => recordedSeconds(recordedMs, segmentStartedAt);

  const ticker = window.setInterval(() => {
    const seconds = elapsed();
    onTick(seconds, paused);
    if (!paused && seconds >= MAX_RECORDING_SECONDS) void finish();
  }, 250);

  function cleanup() {
    window.clearInterval(ticker);
    stream.getTracks().forEach((track) => track.stop());
  }

  /**
   * The file keeps continuous time: everything between pause and resume is
   * dropped, so the clip never shows a frozen frame or a dead stretch.
   */
  function pause() {
    if (finished || paused) return;
    if (segmentStartedAt !== null) {
      recordedMs += Math.max(0, Date.now() - segmentStartedAt);
      segmentStartedAt = null;
    }
    paused = true;
    if (recorder.state === "recording") recorder.pause();
    onTick(elapsed(), true);
  }

  function resume() {
    if (finished || !paused) return;
    if (recorder.state === "paused") recorder.resume();
    segmentStartedAt = Date.now();
    paused = false;
    onTick(elapsed(), false);
  }

  async function finish() {
    if (finished) return;
    finished = true;
    window.clearInterval(ticker);

    const durationSeconds = Math.max(1, Math.round(elapsed()));
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    // Stop is legal from paused, but resuming first is the safe path across
    // browsers; the frozen duration was already taken above.
    if (recorder.state === "paused") recorder.resume();
    if (recorder.state !== "inactive") recorder.stop();
    else resolveNow();

    await stopped;
    cleanup();

    const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "video/webm" });
    const posterDataUrl = await posterFor(blob, durationSeconds);

    onFinish({
      blob,
      mimeType: blob.type || "video/webm",
      durationSeconds,
      posterDataUrl,
      createdAt: Date.now(),
    });
  }

  function resolveNow() {
    // The recorder never started, so there is no onstop to wait for.
    recorder.onstop?.(new Event("stop"));
  }

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };

  stream.getVideoTracks()[0]?.addEventListener("ended", () => void finish());

  recorder.start(1000);
  onTick(0, false);

  return {
    stop: () => void finish(),
    pause,
    resume,
    elapsed,
    paused: () => paused,
  };
}
