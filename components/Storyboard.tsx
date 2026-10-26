"use client";

import { useState } from "react";
import ClockBar from "./ClockBar";
import CriteriaPanel from "./CriteriaPanel";
import SceneCard from "./SceneCard";
import { cutNote } from "@/lib/cuts";
import { formatClock } from "@/lib/timing";
import type { Criterion, Scene, ScenePatch } from "@/lib/types";

type Props = {
  scenes: Scene[];
  /** One frame from the recording, shown beside every scene. */
  poster?: string | null;
  criteria: Criterion[];
  /** How long the clip took to read, in seconds. */
  readSeconds?: number | null;
  timelineSeconds?: number;
  redNotes?: Record<string, string>;
  activeSceneId?: string | null;
  onSeekScene?: (scene: Scene) => void;
  statedMinutes?: number | null;
  editable?: boolean;
  rewritingSceneId?: string | null;
  onUpdateScene?: (sceneId: string, patch: ScenePatch) => void;
  onRewriteScene?: (sceneId: string) => void;
  onDeleteScene?: (sceneId: string) => void;
  onImproveFlow?: () => void;
  improvingFlow?: boolean;
};

export default function Storyboard({
  scenes,
  poster = null,
  criteria,
  readSeconds = null,
  timelineSeconds,
  redNotes,
  activeSceneId = null,
  onSeekScene,
  statedMinutes = null,
  editable = false,
  rewritingSceneId = null,
  onUpdateScene,
  onRewriteScene,
  onDeleteScene,
  onImproveFlow,
  improvingFlow = false,
}: Props) {
  const [copied, setCopied] = useState(false);
  const used = timelineSeconds ?? scenes.reduce((sum, scene) => sum + scene.seconds, 0);
  const labelById = new Map(
    criteria.map((criterion) => [criterion.id, criterion.label]),
  );

  async function copyScript() {
    const lines = [`Demo script — ${formatClock(used)}`, ""];

    scenes.forEach((scene, index) => {
      lines.push(`${index + 1}. (${formatClock(scene.startSeconds ?? 0)}–${formatClock((scene.startSeconds ?? 0) + scene.seconds)})`);
      if (scene.visualDescription) lines.push(`On screen: ${scene.visualDescription}`);
      lines.push(scene.spokenLine);
      if (scene.caption) lines.push(`Caption: ${scene.caption}`);
      lines.push("");
    });

    try {
      await navigator.clipboard.writeText(lines.join("\n").trimEnd());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission can be refused; the script is still on screen.
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
        <p className="text-[12px] text-muted">
          Your script
          {readSeconds != null ? (
            <span className="ml-2 text-[11px] tabular-nums text-faint">
              read in{" "}
              {readSeconds >= 60
                ? formatClock(readSeconds)
                : `${Math.round(readSeconds)} second${Math.round(readSeconds) === 1 ? "" : "s"}`}
            </span>
          ) : null}
        </p>
        {onImproveFlow ? <button type="button" disabled={improvingFlow || scenes.length === 0} onClick={onImproveFlow}
          className="text-[12px] text-accent underline decoration-hairline underline-offset-4 disabled:opacity-40">
          {improvingFlow ? "Developing explanations…" : "Expand explanations"}
        </button> : null}
        <button
          type="button"
          onClick={() => void copyScript()}
          className="text-[12px] text-accent underline decoration-hairline underline-offset-4 hover:decoration-accent"
        >
          {copied ? "Copied" : "Copy script"}
        </button>
      </div>

      <ClockBar used={used} statedMinutes={statedMinutes} />

      <div className="border-t border-hairline">
        {scenes.length === 0 ? (
          <p className="py-6 text-[13px] leading-relaxed text-muted">
            Every scene is gone. Make the script again to start over.
          </p>
        ) : null}
        {scenes.map((scene, index) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            poster={poster ?? undefined}
            index={index}
            covers={scene.covers
              .map((id) => labelById.get(id))
              .filter((label): label is string => Boolean(label))}
            active={scene.id === activeSceneId}
            onSeek={onSeekScene ? () => onSeekScene(scene) : undefined}
            cutNote={criteria.length ? cutNote(scene.seconds, scene.covers, used) : null}
            editable={editable}
            rewriting={rewritingSceneId === scene.id}
            onUpdate={
              onUpdateScene
                ? (patch) => onUpdateScene(scene.id, patch)
                : undefined
            }
            onRewrite={
              onRewriteScene ? () => onRewriteScene(scene.id) : undefined
            }
            onDelete={
              onDeleteScene ? () => onDeleteScene(scene.id) : undefined
            }
          />
        ))}
      </div>

      {criteria.length > 0 ? (
        <CriteriaPanel criteria={criteria} scenes={scenes} redNotes={redNotes} />
      ) : null}
    </div>
  );
}
