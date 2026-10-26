"use client";

import type { PendingStory } from "@/lib/storyContext";
import { formatClock } from "@/lib/timing";

export default function StoryQuestions({ pending, busy, onAnswer, onContinue }: {
  pending: PendingStory; busy: boolean; onAnswer: (id: string, answer: string) => void; onContinue: () => void;
}) {
  const complete = pending.questions.every(item => pending.answers[item.id]?.trim());
  return <section aria-label="Follow-up questions" className="border border-hairline p-5">
    <h2 className="text-[15px] text-ink">{pending.questions.length ? "A little context before we write" : "Your video analysis is ready"}</h2>
    <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{pending.questions.length ? "Your recording has been analyzed. These answers will help us explain each scene for its full duration, without guessing. We’ll reuse the analysis when you continue." : "Your recording and scene timings are saved. Continue to write the descriptive passages without uploading the video again."}</p>
    {pending.writingError ? <p role="alert" className="mt-3 text-[12px] text-flag">{pending.writingError}</p> : null}
    <form onSubmit={event => { event.preventDefault(); if (complete && !busy) onContinue(); }}>
      {pending.questions.map(item => {
        const scene = pending.scenes[item.sceneIndex];
        return <div key={item.id} className="mt-5">
          <p className="mb-1 text-[11px] text-faint">Scene {item.sceneIndex + 1}{scene ? ` · ${formatClock(scene.startSeconds ?? 0)} · ${formatClock(scene.seconds)} long` : ""}</p>
          <label htmlFor={`followup-${item.id}`} className="text-[13px] leading-relaxed text-ink">{item.question}</label>
          <textarea id={`followup-${item.id}`} rows={4} maxLength={1800} required disabled={busy}
            value={pending.answers[item.id] ?? ""} onChange={event => onAnswer(item.id, event.target.value)}
            className="mt-2 w-full border border-hairline bg-transparent px-3 py-2 text-[13px] leading-relaxed text-ink outline-none focus:border-accent disabled:opacity-50" />
        </div>;
      })}
      <p className="mt-3 text-[11.5px] text-muted">If you don’t know a detail, say so. We’ll leave unsupported claims out.</p>
      <button type="submit" disabled={!complete || busy} className="mt-4 bg-accent px-4 py-2 text-[13px] text-paper disabled:opacity-40">{busy ? "Writing explanations…" : "Write my descriptive script"}</button>
    </form>
  </section>;
}
