"use client";

import { useState } from "react";
import ClockBar from "./ClockBar";
import CriteriaPanel from "./CriteriaPanel";
import SceneCard from "./SceneCard";
import { formatClock } from "@/lib/timing";
import type { Criterion, Scene, Shot } from "@/lib/types";

type Props = {
  scenes: Scene[];
  shots: Shot[];
  criteria: Criterion[];
  lengthSeconds: number;
  redNotes?: Record<string, string>;
  activeSceneId?: string | null;
  onSeekScene?: (scene: Scene) => void;
};

export default function Storyboard({
  scenes,
  shots,
  criteria,
  lengthSeconds,
  redNotes,
  activeSceneId = null,
  onSeekScene,
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

      <ClockBar used={used} limit={lengthSeconds} />
      <div className="border-t border-hairline">
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
          />
        ))}
      </div>
      {criteria.length > 0 ? (
        <CriteriaPanel criteria={criteria} scenes={scenes} redNotes={redNotes} />
      ) : null}
    </div>
  );
}
