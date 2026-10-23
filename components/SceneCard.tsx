import { formatClock } from "@/lib/timing";
import type { Scene, Shot } from "@/lib/types";

export default function SceneCard({
  scene,
  shot,
  index,
  covers = [],
  active = false,
  onSeek,
}: {
  scene: Scene;
  shot?: Shot;
  index: number;
  covers?: string[];
  active?: boolean;
  onSeek?: () => void;
}) {
  return (
    <article
      className={`grid grid-cols-[92px_1fr] gap-5 border-b border-hairline py-5 ${
        active ? "bg-white/55" : ""
      }`}
    >
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {shot?.dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shot.dataUrl}
            alt={shot.note || "Screenshot for this scene"}
            className="h-[62px] w-[92px] border border-hairline object-cover"
          />
        ) : (
          <div className="h-[62px] w-[92px] border border-hairline bg-paper-sunk" />
        )}
        {scene.startSeconds != null && onSeek ? (
          <button
            type="button"
            onClick={onSeek}
            className="mt-2 block text-left text-[11px] tabular-nums text-accent underline decoration-hairline underline-offset-2 hover:decoration-accent"
          >
            ▸ {formatClock(scene.startSeconds)}
          </button>
        ) : (
          <p className="mt-2 text-[11px] tabular-nums text-faint">
            {formatClock(scene.seconds)}
          </p>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <span className="mt-[7px] w-4 shrink-0 text-[11px] tabular-nums text-faint">
            {index + 1}
          </span>
          <p className="font-script text-[17px] leading-[1.75] text-ink">
            {scene.spokenLine}
          </p>
        </div>
        <p className="mt-2 pl-7 text-[12px] leading-relaxed text-muted">
          {scene.caption}
        </p>
        {covers.length > 0 ? (
          <p className="mt-1.5 pl-7 text-[11px] text-ok">
            Proves: {covers.join(" · ")}
          </p>
        ) : null}
      </div>
    </article>
  );
}
