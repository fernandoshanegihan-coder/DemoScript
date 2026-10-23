import ClockBar from "./ClockBar";
import CriteriaPanel from "./CriteriaPanel";
import SceneCard from "./SceneCard";
import type { Criterion, Scene, Shot } from "@/lib/types";

type Props = {
  scenes: Scene[];
  shots: Shot[];
  criteria: Criterion[];
  lengthSeconds: number;
  redNotes?: Record<string, string>;
};

export default function Storyboard({
  scenes,
  shots,
  criteria,
  lengthSeconds,
  redNotes,
}: Props) {
  const used = scenes.reduce((sum, scene) => sum + scene.seconds, 0);
  const shotById = new Map(shots.map((shot) => [shot.id, shot]));

  return (
    <div>
      <ClockBar used={used} limit={lengthSeconds} />
      <div className="border-t border-hairline">
        {scenes.map((scene, index) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            shot={shotById.get(scene.shotId)}
            index={index}
          />
        ))}
      </div>
      <CriteriaPanel criteria={criteria} scenes={scenes} redNotes={redNotes} />
    </div>
  );
}
