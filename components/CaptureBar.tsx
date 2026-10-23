type Props = {
  onCapture: () => void;
  onStop: () => void;
  remaining: number;
};

export default function CaptureBar({ onCapture, onStop, remaining }: Props) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border border-accent/40 bg-white/50 px-3 py-2">
      <p className="text-[12px] leading-snug text-ink">
        Sharing your screen. Switch to your project, then capture a frame.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCapture}
          disabled={remaining <= 0}
          className="bg-accent px-2.5 py-1 text-[12px] text-paper disabled:cursor-not-allowed disabled:bg-paper-sunk disabled:text-faint"
        >
          Capture frame
        </button>
        <button
          type="button"
          onClick={onStop}
          className="text-[11.5px] text-muted hover:text-ink"
        >
          Stop sharing
        </button>
      </div>
    </div>
  );
}
