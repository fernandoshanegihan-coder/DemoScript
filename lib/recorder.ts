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
  elapsed: () => number;
};

type StartOptions = {
  onTick: (elapsedSeconds: number) => void;
  onFinish: (result: RecordingResult) => void;
};

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
 * purpose: the app supplies the narration, so one voice is audible at a time.
 *
 * `onFinish` fires exactly once — on Stop, at the three-minute limit, or when
 * the user ends sharing from the browser's own bar.
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
  const startedAt = Date.now();
  let finished = false;

  const elapsed = () =>
    Math.min(MAX_RECORDING_SECONDS, (Date.now() - startedAt) / 1000);

  const ticker = window.setInterval(() => {
    const seconds = elapsed();
    onTick(seconds);
    if (seconds >= MAX_RECORDING_SECONDS) finish();
  }, 250);

  function cleanup() {
    window.clearInterval(ticker);
    stream.getTracks().forEach((track) => track.stop());
  }

  async function finish() {
    if (finished) return;
    finished = true;
    window.clearInterval(ticker);

    const durationSeconds = Math.max(1, Math.round(elapsed()));
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

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
  onTick(0);

  return {
    stop: () => void finish(),
    elapsed,
  };
}
