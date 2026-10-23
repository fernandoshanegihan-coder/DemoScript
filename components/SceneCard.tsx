"use client";

import { useState } from "react";
import { formatClock } from "@/lib/timing";
import type { Scene, ScenePatch, Shot } from "@/lib/types";

export default function SceneCard({
  scene,
  shot,
  index,
  covers = [],
  active = false,
  onSeek,
  cutNote = null,
  editable = false,
  rewriting = false,
  onUpdate,
  onRewrite,
  onDelete,
}: {
  scene: Scene;
  shot?: Shot;
  index: number;
  covers?: string[];
  active?: boolean;
  onSeek?: () => void;
  cutNote?: string | null;
  editable?: boolean;
  rewriting?: boolean;
  onUpdate?: (patch: ScenePatch) => void;
  onRewrite?: () => void;
  onDelete?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
          {editing ? (
            <textarea
              value={scene.spokenLine}
              onChange={(event) => onUpdate?.({ spokenLine: event.target.value })}
              rows={4}
              aria-label={`Spoken line for scene ${index + 1}`}
              className="w-full resize-y border border-hairline bg-white/60 px-2.5 py-2 font-script text-[17px] leading-[1.75] text-ink outline-none focus:border-accent"
            />
          ) : (
            <p className="font-script text-[17px] leading-[1.75] text-ink">
              {scene.spokenLine}
            </p>
          )}
        </div>

        <div className="mt-2 pl-7">
          {editing ? (
            <input
              value={scene.caption}
              onChange={(event) => onUpdate?.({ caption: event.target.value })}
              aria-label={`Caption for scene ${index + 1}`}
              className="w-full border border-hairline bg-white/60 px-2.5 py-1.5 text-[12.5px] leading-relaxed text-ink outline-none focus:border-accent"
            />
          ) : (
            <p className="text-[12px] leading-relaxed text-muted">{scene.caption}</p>
          )}
        </div>

        {covers.length > 0 ? (
          <p className="mt-1.5 pl-7 text-[11px] text-ok">
            Proves: {covers.join(" · ")}
          </p>
        ) : null}

        {cutNote ? (
          <p className="mt-1.5 pl-7 text-[11.5px] leading-relaxed text-flag">
            {cutNote}
          </p>
        ) : null}

        {editing && scene.startSeconds == null ? (
          <div className="mt-3 pl-7">
            <label
              htmlFor={`description-${scene.id}`}
              className="text-[10.5px] uppercase tracking-[0.08em] text-faint"
            >
              Built from
            </label>
            <textarea
              id={`description-${scene.id}`}
              value={scene.description}
              onChange={(event) =>
                onUpdate?.({ description: event.target.value })
              }
              rows={2}
              placeholder="What does this screen show?"
              className="mt-1.5 w-full resize-y border border-hairline bg-white/60 px-2.5 py-1.5 text-[12.5px] leading-relaxed text-ink outline-none focus:border-accent"
            />
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <button
                type="button"
                onClick={onRewrite}
                disabled={rewriting || !scene.description.trim()}
                className="text-[11.5px] text-accent underline decoration-hairline underline-offset-2 hover:decoration-accent disabled:text-faint disabled:no-underline"
              >
                {rewriting ? "Rewriting…" : "Rewrite this scene"}
              </button>
              <span className="text-[11px] text-faint">
                Only this scene changes.
              </span>
            </div>
          </div>
        ) : null}

        {editable ? (
          <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2 pl-7">
            <button
              type="button"
              onClick={() => {
                setEditing((open) => !open);
                setConfirmDelete(false);
              }}
              className="text-[11.5px] text-muted underline decoration-hairline underline-offset-2 hover:text-ink hover:decoration-accent"
            >
              {editing ? "Done" : "Edit"}
            </button>

            {confirmDelete ? (
              <span className="flex items-baseline gap-2 text-[11.5px] text-muted">
                Remove this scene?
                <button
                  type="button"
                  onClick={onDelete}
                  className="text-flag underline decoration-hairline underline-offset-2 hover:decoration-flag"
                >
                  Remove
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="underline decoration-hairline underline-offset-2 hover:decoration-accent"
                >
                  Keep
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-[11.5px] text-faint hover:text-flag"
              >
                Remove scene
              </button>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}
