"use client";

import { useState } from "react";
import ClockBar from "./ClockBar";
import CriteriaPanel from "./CriteriaPanel";
import SceneCard from "./SceneCard";
import { cutNote } from "@/lib/cuts";
import { formatClock } from "@/lib/timing";
import type { Criterion, Scene, ScenePatch, Shot } from "@/lib/types";

type Props = {
  scenes: Scene[];
  shots: Shot[];
  criteria: Criterion[];
  lengthSeconds: number;
  redNotes?: Record<string, string>;
  activeSceneId?: string | null;
  onSeekScene?: (scene: Scene) => void;
  statedMinutes?: number | null;
  editable?: boolean;
  rewritingSceneId?: string | null;
  onUpdateScene?: (sceneId: string, patch: ScenePatch) => void;
  onRewriteScene?: (sceneId: string) => void;
  onDeleteScene?: (sceneId: string) => void;
};

export default function Storyboard({
  scenes,
  shots,
  criteria,
  lengthSeconds,
  redNotes,
  activeSceneId = null,
  onSeekScene,
  statedMinutes = null,
  editable = false,
  rewritingSceneId = null,
  onUpdateScene,
  onRewriteScene,
  onDeleteScene,
}: Props) {
  const [copied, setCopied] = useState(false);
  const used = scenes.reduce((sum, scene) => sum + scene.seconds, 0);
  const shotById = new Map(shots.map((shot) => [shot.id, shot]));
  const labelById = new Map(
    criteria.map((criterion) => [criterion.id, criterion.label]),
  );

  async function copyScript() {
    const lines = [`Demo script — ${formatClock(lengthSeconds)}`, ""];

    scenes.forEach((scene, index) => {
      lines.push(`${index + 1}. (${formatClock(scene.seconds)})`);
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
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <p className="text-[12px] text-muted">Your script</p>
        <button
          type="button"
          onClick={() => void copyScript()}
          className="text-[12px] text-accent underline decoration-hairline underline-offset-4 hover:decoration-accent"
        >
          {copied ? "Copied" : "Copy script"}
        </button>
      </div>

      <ClockBar
        used={used}
        limit={lengthSeconds}
        statedMinutes={statedMinutes}
      />

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
            shot={shotById.get(scene.shotId)}
            index={index}
            covers={scene.covers
              .map((id) => labelById.get(id))
              .filter((label): label is string => Boolean(label))}
            active={scene.id === activeSceneId}
            onSeek={onSeekScene ? () => onSeekScene(scene) : undefined}
            cutNote={cutNote(scene.seconds, scene.covers, lengthSeconds)}
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
