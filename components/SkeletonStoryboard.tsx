export default function SkeletonStoryboard({
  onTrySample,
  busyLine,
}: {
  onTrySample: () => void;
  busyLine?: string | null;
}) {
  return (
    <div className="relative min-h-[520px]">
      <div aria-hidden className="opacity-[0.55]">
        <div className="mb-6">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[12px] text-muted">Running time</span>
            <span className="text-[13px] tabular-nums text-muted">0:00</span>
          </div>
          <div className="h-px w-full bg-hairline" />
        </div>

        <div className="border-t border-hairline">
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="grid grid-cols-[92px_1fr] gap-5 border-b border-hairline py-5"
            >
              <div className="h-[62px] w-[92px] border border-hairline bg-paper-sunk" />
              <div className="space-y-2.5 pt-1">
                <div className="h-[7px] w-[86%] bg-paper-sunk" />
                <div className="h-[7px] w-[72%] bg-paper-sunk" />
                <div className="h-[6px] w-[38%] bg-paper-sunk" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-0 grid place-items-center">
        <div className="max-w-[23rem] px-6 text-center">
          <p className="text-[15px] leading-relaxed text-ink">
            {busyLine ??
              "Your project’s story will take shape here: the problem, the solution, the proof, and a takeaway worth remembering."}
          </p>
          {busyLine ? (
            <p className="mt-3 text-[12px] text-muted">
              Keep this tab open — usually ten to thirty seconds.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
            <a href="/?sample=launchpad" target="_blank" rel="noopener" className="inline-block bg-accent px-4 py-2 text-[12.5px] text-paper">Try a sample demo</a>
            <p className="text-[11.5px] text-muted">Launchpad · Ready-made script and voice · Opens separately</p>
            <button
              type="button"
              onClick={onTrySample}
              className="mt-4 text-[12.5px] text-accent underline decoration-hairline underline-offset-4 hover:decoration-accent"
            >
              Try it with a recording you already have
            </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
