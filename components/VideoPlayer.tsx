"use client";

import { formatClock } from "@/lib/timing";
import type { Scene } from "@/lib/types";
import { sceneAtVideoTime } from "@/lib/sceneTimeline";

type Props = {
  src: string;
  scenes: Scene[];
  durationSeconds: number;
  activeSceneId: string | null;
  onActiveScene: (sceneId: string | null) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
};

export default function VideoPlayer({
  src,
  scenes,
  durationSeconds,
  activeSceneId,
  onActiveScene,
  videoRef,
}: Props) {
  const total = Math.max(1, durationSeconds);
  const active = scenes.find((scene) => scene.id === activeSceneId);

  return (
    <div className="mb-7 border border-hairline">
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        controls
        preload="metadata"
        onTimeUpdate={(event) => {
          const next = scenes[sceneAtVideoTime(scenes, event.currentTarget.currentTime)]?.id ?? null;
          if (next !== activeSceneId) onActiveScene(next);
        }}
        className="block w-full bg-ink"
      />

      <div className="relative h-9 border-t border-hairline">
        <div
          className="absolute inset-y-0 left-0 bg-paper-sunk"
          style={{
            width: `${
              active
                ? Math.min(
                    100,
                    (((active.startSeconds ?? 0) + active.seconds) / total) * 100,
                  )
                : 0
            }%`,
          }}
        />
        {scenes.map((scene, index) => {
          const left = Math.min(100, ((scene.startSeconds ?? 0) / total) * 100);
          return (
            <button
              key={scene.id}
              type="button"
              title={`Scene ${index + 1} — ${formatClock(scene.startSeconds ?? 0)}`}
              aria-label={`Jump to scene ${index + 1} at ${formatClock(scene.startSeconds ?? 0)}`}
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = scene.startSeconds ?? 0;
                  void videoRef.current.play().catch(() => undefined);
                }
                onActiveScene(scene.id);
              }}
              className="absolute top-0 h-full w-3 -translate-x-1/2"
            >
              <span
                className={`mx-auto block h-full w-px ${
                  scene.id === activeSceneId ? "bg-accent" : "bg-accent/40"
                }`}
              />
            </button>
          );
        })}
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10.5px] tabular-nums text-faint">
          {formatClock(total)}
        </span>
      </div>
    </div>
  );
}
