export const MAX_RECORDING_SECONDS = 180;

/** Same cap the upload API enforces. */
export const MAX_UPLOAD_BYTES = 250 * 1024 * 1024;

export type RecordingResult = {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
  posterDataUrl: string;
  createdAt: number;
};

export type RecordingSession = {
  start: () => void;
  stop: () => void;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
  elapsed: () => number;
  paused: () => boolean;
  started: () => boolean;
};

type StartOptions = {
  onTick: (elapsedSeconds: number, paused: boolean) => void;
  onFinish: (result: RecordingResult) => void;
  onCancel?: () => void;
  /** Arm the take and wait for `start()`. Defaults to starting at once. */
  autoStart?: boolean;
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

export function isVideoFile(file: File): boolean {
  return (
    file.type.startsWith("video/") || /\.(webm|mp4|m4v|mov)$/i.test(file.name)
  );
}

/**
 * MediaRecorder writes WebM without a duration header, so `duration` is often
 * Infinity. Seeking past the end makes the browser work it out.
 */
async function readDuration(url: string): Promise<number> {
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.src = url;

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("metadata timeout")), 8000);
    video.onloadedmetadata = () => {
      clearTimeout(timer);
      resolve();
    };
    video.onerror = () => {
      clearTimeout(timer);
      reject(new Error("metadata failed"));
    };
  });

  if (Number.isFinite(video.duration) && video.duration > 0) {
    return video.duration;
  }

  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 3000);
    video.ontimeupdate = () => {
      clearTimeout(timer);
      video.ontimeupdate = null;
      resolve();
    };
    video.currentTime = 1e101;
  });

  return Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
}

/**
 * A recording the student already has. Read its length and poster frame here so
 * it behaves exactly like one made in the browser.
 */
export async function inspectVideo(file: File): Promise<RecordingResult> {
  if (!isVideoFile(file)) {
    throw new Error("That file isn't a screen recording. Use a .webm, .mp4 or .mov file.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("That recording is larger than 250 MB. Three minutes is the limit.");
  }

  const url = URL.createObjectURL(file);
  try {
    const seconds = await readDuration(url);
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error("Unknown video duration.");
    if (seconds > MAX_RECORDING_SECONDS) {
      throw new Error("Use a recording no longer than three minutes.");
    }
    const posterDataUrl = await posterFor(file, seconds);
    return {
      blob: file,
      mimeType: file.type || "video/webm",
      durationSeconds: seconds,
      posterDataUrl,
      createdAt: Date.now(),
    };
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message.includes("three minutes") ? error.message :
      "That recording couldn't be read. Try a .webm or .mp4 file, or record your screen instead.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
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
  onCancel,
  autoStart = true,
}: StartOptions): Promise<RecordingSession> {
  if (!canRecordScreen()) {
    throw new Error(
      "This browser can't record the screen — use Chrome, or upload a recording instead.",
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
      "Screen recording was blocked or cancelled. Allow this tab to share a screen, or upload a recording instead.",
    );
  }

  const mimeType = preferredMimeType();

  // A refused codec must not strand the share: the stream is already live,
  // so release it before surfacing the plain failure line.
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(
      stream,
      mimeType
        ? { mimeType, videoBitsPerSecond: 2_500_000 }
        : { videoBitsPerSecond: 2_500_000 },
    );
  } catch {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error(
      "This browser can't record the screen — use Chrome, or upload a recording instead.",
    );
  }

  const chunks: Blob[] = [];
  let finished = false;
  let started = false;
  let paused = false;
  let recordedMs = 0;
  let segmentStartedAt: number | null = null;
  let ticker: number | null = null;

  const elapsed = () => recordedSeconds(recordedMs, segmentStartedAt);

  function clearTicker() {
    if (ticker !== null) {
      window.clearInterval(ticker);
      ticker = null;
    }
  }

  function cleanup() {
    clearTicker();
    stream.getTracks().forEach((track) => track.stop());
  }

  /**
   * The clock and the file both begin here, not when the window was picked.
   * Nothing before this call can end up in the clip.
   */
  function start() {
    if (finished || started) return;
    started = true;
    paused = false;
    segmentStartedAt = Date.now();
    recorder.start(1000);
    onTick(0, false);
    ticker = window.setInterval(() => {
      const seconds = elapsed();
      onTick(seconds, paused);
      if (!paused && seconds >= MAX_RECORDING_SECONDS) void finish();
    }, 250);
  }

  /**
   * The file keeps continuous time: everything between pause and resume is
   * dropped, so the clip never shows a frozen frame or a dead stretch.
   */
  function pause() {
    if (finished || !started || paused) return;
    if (segmentStartedAt !== null) {
      recordedMs += Math.max(0, Date.now() - segmentStartedAt);
      segmentStartedAt = null;
    }
    paused = true;
    if (recorder.state === "recording") recorder.pause();
    onTick(elapsed(), true);
  }

  function resume() {
    if (finished || !started || !paused) return;
    if (recorder.state === "paused") recorder.resume();
    segmentStartedAt = Date.now();
    paused = false;
    onTick(elapsed(), false);
  }

  /** Release the stream without producing a take — the armed state's exit. */
  function cancel() {
    if (finished) return;
    finished = true;
    cleanup();
    onCancel?.();
  }

  async function finish() {
    if (finished) return;
    if (!started) {
      cancel();
      return;
    }
    finished = true;
    clearTicker();

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

  if (autoStart) start();

  return {
    start,
    stop: () => {
      if (!started) {
        cancel();
        return;
      }
      void finish();
    },
    cancel,
    pause,
    resume,
    elapsed,
    paused: () => paused,
    started: () => started,
  };
}
