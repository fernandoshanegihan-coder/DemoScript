"use client";

import { BRIEF_QUESTIONS, type ProjectBrief } from "@/lib/projectBrief";

export default function ProjectInterview({ brief, onChange, disabled }: {
  brief: ProjectBrief; onChange: (brief: ProjectBrief) => void; disabled: boolean;
}) {
  return <fieldset disabled={disabled} className="mt-7 border-t border-hairline pt-5">
    <legend className="text-[13px] text-ink">Tell us the story behind your project</legend>
    <p className="mb-4 text-[12px] leading-relaxed text-muted">A few short answers turn your footage into a professional demo. We’ll blend your project’s story with the actions on screen.</p>
    {BRIEF_QUESTIONS.map((question, index) => <div key={question.key} className="mt-4">
      <label htmlFor={`brief-${question.key}`} className="block text-[12.5px] leading-relaxed text-ink">
        {index + 1}. {question.label} <span className="text-faint">{question.required ? "Required" : "Optional"}</span>
      </label>
      <textarea id={`brief-${question.key}`} rows={3} maxLength={1200} required={question.required}
        value={brief[question.key]} onChange={event => onChange({ ...brief, [question.key]: event.target.value })}
        placeholder={question.hint}
        className="mt-2 w-full resize-y border border-hairline bg-transparent px-3 py-2 text-[13px] leading-relaxed text-ink outline-none placeholder:text-faint focus:border-accent disabled:opacity-50" />
    </div>)}
    <p className="mt-3 text-[11.5px] leading-relaxed text-muted">Your answers explain the context; the video supplies the proof. The opening frames can introduce the problem, and the closing frames can carry your takeaway. Make the script again to apply these answers to an existing demo.</p>
  </fieldset>;
}
