import { formatClock } from "@/lib/timing";
import type { Scene, Shot } from "@/lib/types";

export default function SceneCard({
  scene,
  shot,
  index,
}: {
  scene: Scene;
  shot?: Shot;
  index: number;
}) {
  return (
    <article className="grid grid-cols-[92px_1fr] gap-5 border-b border-hairline py-5">
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={shot?.dataUrl ?? ""}
          alt={shot?.note ?? "Screenshot for this scene"}
          className="h-[62px] w-[92px] border border-hairline object-cover"
        />
        <p className="mt-2 text-[11px] tabular-nums text-faint">
          {formatClock(scene.seconds)}
        </p>
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
      </div>
    </article>
  );
}
