import type { Criterion, Scene } from "@/lib/types";

type Props = {
  criteria: Criterion[];
  scenes: Scene[];
  redNotes?: Record<string, string>;
};

export default function CriteriaPanel({ criteria, scenes, redNotes }: Props) {
  const covered = new Set(scenes.flatMap((scene) => scene.covers));

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[13px] text-muted">What your video is judged on</h2>
      <ul className="border-t border-hairline">
        {criteria.map((criterion) => {
          const isCovered = covered.has(criterion.id);
          return (
            <li
              key={criterion.id}
              className="flex gap-3 border-b border-hairline py-3"
            >
              <span
                aria-hidden
                className={`mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full ${
                  isCovered ? "bg-ok" : "bg-flag"
                }`}
              />
              <div className="min-w-0">
                <p
                  className={`text-[13.5px] ${
                    isCovered ? "text-ink" : "text-ink"
                  }`}
                >
                  {criterion.label}
                </p>
                {!isCovered ? (
                  <p className="mt-1 border-l border-flag pl-3 text-[12.5px] leading-relaxed text-flag">
                    {redNotes?.[criterion.id] ??
                      "No scene proves this yet."}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
