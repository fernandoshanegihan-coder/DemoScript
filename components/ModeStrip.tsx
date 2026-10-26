"use client";

export type Mode = "script" | "rehearse" | "record";

/**
 * A quiet row above the storyboard. It changes what the right column is doing
 * without leaving the page; there is nothing to save and nothing to dismiss.
 */
export default function ModeStrip({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (mode: Mode) => void;
}) {
  const item = (id: Mode, label: string) => {
    const active = mode === id;
    return (
      <button
        type="button"
        onClick={() => onChange(id)}
        aria-current={active ? "page" : undefined}
        className={`border-b pb-1 text-[12px] transition-colors ${
          active
            ? "border-ink text-ink"
            : "border-transparent text-faint hover:text-ink"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <nav aria-label="Mode" className="mb-5 flex items-baseline gap-5">
      {item("script", "Script")}
      {item("rehearse", "Rehearse")}
      {item("record", "Record")}
    </nav>
  );
}
