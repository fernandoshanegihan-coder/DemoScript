import { MAX_RECORDING_SECONDS } from "@/lib/recorder";
import { formatClock } from "@/lib/timing";

export type FloatingBar = {
  window: Window;
  setRemaining: (remaining: number) => void;
  close: () => void;
};

export type RecordingBar = {
  window: Window;
  setReady: () => void;
  setClock: (elapsedSeconds: number, paused: boolean) => void;
  close: () => void;
};

export function canFloatControls(): boolean {
  return (
    typeof window !== "undefined" &&
    "documentPictureInPicture" in window &&
    typeof (window as WindowWithPictureInPicture).documentPictureInPicture
      ?.requestWindow === "function"
  );
}

type Options = {
  onCapture: () => void;
  onStop: () => void;
};

/**
 * A tiny always-on-top window with one button, so the user can stay focused on
 * the project they're demoing instead of switching tabs for every frame.
 */
export async function openFloatingBar({
  onCapture,
  onStop,
}: Options): Promise<FloatingBar> {
  const api = (window as WindowWithPictureInPicture).documentPictureInPicture;
  if (!api) throw new Error("Floating capture isn't available in this browser.");

  const pipWindow = await api.requestWindow({ width: 340, height: 112 });

  const style = pipWindow.document.createElement("style");
  style.textContent = `
    html, body { margin: 0; height: 100%; }
    body {
      background: #F6F5F1; color: #16161A; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      padding: 14px 16px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;
      border: 1px solid #D9D7D0;
    }
    .row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
    .label { font-size: 12px; color: #5F6068; }
    .count { font-size: 11px; color: #8B8B92; font-variant-numeric: tabular-nums; }
    .actions { display: flex; align-items: center; gap: 10px; }
    button { font: inherit; cursor: pointer; }
    .capture { flex: 1; background: #2C4A52; color: #F6F5F1; border: 0; padding: 8px 12px; font-size: 13px; }
    .capture:disabled { background: #EFEDE6; color: #8B8B92; cursor: not-allowed; }
    .stop { background: transparent; border: 0; color: #5F6068; font-size: 11.5px; padding: 6px 0; }
    .stop:hover { color: #16161A; }
  `;
  pipWindow.document.head.appendChild(style);

  const label = pipWindow.document.createElement("p");
  label.className = "label";
  label.textContent = "Sharing your screen";

  const count = pipWindow.document.createElement("span");
  count.className = "count";

  const topRow = pipWindow.document.createElement("div");
  topRow.className = "row";
  topRow.append(label, count);

  const capture = pipWindow.document.createElement("button");
  capture.className = "capture";
  capture.type = "button";
  capture.textContent = "Capture frame";
  capture.addEventListener("click", onCapture);

  const stop = pipWindow.document.createElement("button");
  stop.className = "stop";
  stop.type = "button";
  stop.textContent = "Stop sharing";
  stop.addEventListener("click", onStop);

  const actions = pipWindow.document.createElement("div");
  actions.className = "actions";
  actions.append(capture, stop);

  pipWindow.document.body.append(topRow, actions);

  pipWindow.addEventListener("pagehide", onStop);

  return {
    window: pipWindow,
    setRemaining(remaining: number) {
      count.textContent = `${remaining} left`;
      capture.disabled = remaining <= 0;
      capture.textContent = remaining <= 0 ? "All 6 used" : "Capture frame";
    },
    close() {
      if (!pipWindow.closed) pipWindow.close();
    },
  };
}

type RecordingOptions = {
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCancel: () => void;
  onClose: () => void;
};

/**
 * Always-on-top controls for the take, so the project window can stay focused
 * and the switch back to DemoScript is never part of the file. It opens armed,
 * not recording: the user switches to their project and presses Start.
 * Closing this window leaves the take armed or recording; the in-page strip
 * still has the controls.
 */
export async function openRecordingBar({
  onStart,
  onPause,
  onResume,
  onStop,
  onCancel,
  onClose,
}: RecordingOptions): Promise<RecordingBar> {
  const api = (window as WindowWithPictureInPicture).documentPictureInPicture;
  if (!api) {
    throw new Error("Floating controls aren't available in this browser.");
  }

  const pipWindow = await api.requestWindow({ width: 340, height: 132 });

  const style = pipWindow.document.createElement("style");
  style.textContent = `
    html, body { margin: 0; height: 100%; }
    body {
      background: #F6F5F1; color: #16161A; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      padding: 14px 16px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;
      border: 1px solid #D9D7D0;
    }
    .row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
    .label { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #5F6068; }
    .dot { width: 6px; height: 6px; border-radius: 999px; background: #B4453C; animation: pulse 1.6s ease-in-out infinite; }
    .dot.ready { background: #2C4A52; animation: none; }
    .dot.paused { background: #8B8B92; animation: none; }
    .count { font-size: 11px; color: #8B8B92; font-variant-numeric: tabular-nums; }
    .note { min-height: 14px; margin-top: 3px; font-size: 11px; color: #8B8B92; }
    .actions { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
    button { font: inherit; cursor: pointer; }
    .toggle { flex: 1; background: #2C4A52; color: #F6F5F1; border: 0; padding: 8px 12px; font-size: 13px; }
    .toggle:hover { opacity: 0.9; }
    .stop { background: transparent; border: 0; color: #5F6068; font-size: 11.5px; padding: 6px 0; }
    .stop:hover { color: #16161A; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
  `;
  pipWindow.document.head.appendChild(style);

  const dot = pipWindow.document.createElement("span");
  dot.className = "dot";

  const labelText = pipWindow.document.createElement("span");
  labelText.textContent = "Ready to record";

  const label = pipWindow.document.createElement("p");
  label.className = "label";
  label.append(dot, labelText);

  const count = pipWindow.document.createElement("span");
  count.className = "count";

  const topRow = pipWindow.document.createElement("div");
  topRow.className = "row";
  topRow.append(label, count);

  const note = pipWindow.document.createElement("p");
  note.className = "note";

  let ready = true;
  let paused = false;

  const toggle = pipWindow.document.createElement("button");
  toggle.className = "toggle";
  toggle.type = "button";
  toggle.textContent = "Start recording";
  toggle.addEventListener("click", () => {
    if (ready) {
      ready = false;
      paused = false;
      renderLive(0);
      onStart();
      return;
    }
    if (paused) onResume();
    else onPause();
  });

  const secondary = pipWindow.document.createElement("button");
  secondary.className = "stop";
  secondary.type = "button";
  secondary.textContent = "Cancel";
  secondary.addEventListener("click", () => {
    if (ready) onCancel();
    else onStop();
  });

  const actions = pipWindow.document.createElement("div");
  actions.className = "actions";
  actions.append(toggle, secondary);

  const body = pipWindow.document.createElement("div");
  body.append(topRow, note, actions);
  pipWindow.document.body.append(body);

  function renderReady() {
    ready = true;
    paused = false;
    labelText.textContent = "Ready to record";
    count.textContent = `0:00 of ${formatClock(MAX_RECORDING_SECONDS)}`;
    dot.className = "dot ready";
    toggle.textContent = "Start recording";
    secondary.textContent = "Cancel";
    note.textContent = "Switch to your project, then press Start.";
  }

  function renderLive(elapsedSeconds: number) {
    ready = false;
    count.textContent = `${formatClock(elapsedSeconds)} of ${formatClock(MAX_RECORDING_SECONDS)}`;
    labelText.textContent = paused
      ? "Recording paused"
      : "Recording your screen";
    dot.className = paused ? "dot paused" : "dot";
    toggle.textContent = paused ? "Resume" : "Pause";
    secondary.textContent = "Stop recording";
    note.textContent = paused ? "Paused — this time is cut from the clip." : "";
  }

  renderReady();
  pipWindow.addEventListener("pagehide", () => onClose());

  return {
    window: pipWindow,
    setReady() {
      renderReady();
    },
    setClock(elapsedSeconds, nextPaused) {
      paused = nextPaused;
      renderLive(elapsedSeconds);
    },
    close() {
      if (!pipWindow.closed) pipWindow.close();
    },
  };
}
