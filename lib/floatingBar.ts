export type FloatingBar = {
  window: Window;
  setRemaining: (remaining: number) => void;
  close: () => void;
};

export function canFloatCapture(): boolean {
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
