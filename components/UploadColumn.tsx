import type { Shot, Tone } from "@/lib/types";

const TONES: { id: Tone; label: string }[] = [
  { id: "professional", label: "Professional" },
  { id: "energetic", label: "Energetic" },
  { id: "storytelling", label: "Storytelling" },
];

type Props = {
  shots: Shot[];
  rubric: string;
  tone: Tone;
  minutes: number;
  isSample: boolean;
  onClearSample: () => void;
};

export default function UploadColumn({
  shots,
  rubric,
  tone,
  minutes,
  isSample,
  onClearSample,
}: Props) {
  const hasShots = shots.length > 0;

  return (
    <div>
      {hasShots ? (
        <ol className="space-y-3">
          {shots.map((shot, index) => (
            <li
              key={shot.id}
              className="grid grid-cols-[64px_1fr] gap-3 border border-hairline bg-white/40 p-2.5"
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shot.dataUrl}
                  alt={shot.fileName}
                  className="h-[46px] w-[64px] border border-hairline object-cover"
                />
                <span className="absolute -left-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-ink text-[9px] tabular-nums text-paper">
                  {index + 1}
                </span>
              </div>
              <div className="min-w-0">
                <input
                  readOnly
                  value={shot.note}
                  aria-label={`Note for screenshot ${index + 1}`}
                  className="w-full border-0 bg-transparent p-0 text-[13px] text-ink outline-none placeholder:text-faint"
                />
                <p className="mt-1 truncate text-[11px] text-faint">
                  {shot.fileName} · 1 action
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="border border-dashed border-hairline px-6 py-7">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[14px] leading-snug text-ink">
                Drop screenshots here, in the order you'd show them.
              </p>
              <p className="mt-2 max-w-[26rem] text-[12.5px] leading-relaxed text-muted">
                One screenshot is fine too. Add a note for each thing you'd do on
                it.
              </p>
            </div>
            <svg
              aria-hidden
              viewBox="0 0 46 40"
              className="mt-1 h-9 w-10 shrink-0 text-hairline"
              fill="none"
              stroke="currentColor"
            >
              <rect x="1" y="1" width="32" height="24" strokeWidth="1" />
              <rect x="6" y="6" width="32" height="24" strokeWidth="1" />
              <rect x="11" y="11" width="32" height="24" strokeWidth="1" />
            </svg>
          </div>
          <p className="mt-6 text-[11px] text-faint">
            Don't include passwords or personal data.
          </p>
        </div>
      )}

      <div className="mt-7">
        <label
          htmlFor="rubric"
          className="block text-[13px] text-muted"
        >
          What will your video be judged on?
        </label>
        <textarea
          id="rubric"
          readOnly
          rows={4}
          value={rubric}
          placeholder={
            "Paste the criteria, in whatever form you have them.\n\nDesign, Innovation, Presentation\nTechnical depth 40%, Documentation 20%, Demo 20%"
          }
          className="mt-2 w-full resize-none border border-hairline bg-transparent px-3 py-2.5 text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-faint"
        />
        <p className="mt-2 text-[12px] text-muted">
          No rubric? Leave it empty and you'll get the script without the
          checklist.
        </p>
      </div>

      <div className="mt-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-2 text-[12px] text-muted">Tone</p>
          <div className="flex border border-hairline">
            {TONES.map((option) => (
              <span
                key={option.id}
                className={`px-3 py-1.5 text-[12.5px] ${
                  option.id === tone
                    ? "bg-ink text-paper"
                    : "text-muted"
                }`}
              >
                {option.label}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[12px] text-muted">Length</p>
          <div className="flex items-center gap-3 border border-hairline px-3 py-1.5">
            <span aria-hidden className="text-[13px] text-faint">−</span>
            <span className="text-[12.5px] tabular-nums text-ink">
              {minutes} min
            </span>
            <span aria-hidden className="text-[13px] text-faint">+</span>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <button
          type="button"
          disabled={!hasShots || isSample}
          className="w-full bg-accent px-4 py-2.5 text-[13.5px] text-paper transition-opacity disabled:cursor-not-allowed disabled:bg-paper-sunk disabled:text-faint"
        >
          Make my script
        </button>
        <p className="mt-2 text-[12px] text-muted">
          {isSample
            ? "You're looking at a sample project."
            : hasShots
              ? "Ready when you are."
              : "Add a screenshot to start."}
        </p>
        {isSample ? (
          <button
            type="button"
            onClick={onClearSample}
            className="mt-1 text-[12px] text-accent underline decoration-hairline underline-offset-4 hover:decoration-accent"
          >
            Start with your own screenshots
          </button>
        ) : null}
      </div>
    </div>
  );
}
