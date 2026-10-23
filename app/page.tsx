"use client";

import { useState } from "react";
import SkeletonStoryboard from "@/components/SkeletonStoryboard";
import Storyboard from "@/components/Storyboard";
import UploadColumn from "@/components/UploadColumn";
import { sampleProject, sampleRedNotes } from "@/lib/sampleProject";

export default function Page() {
  const [view, setView] = useState<"empty" | "sample">("empty");

  const isSample = view === "sample";
  const shots = isSample ? sampleProject.shots : [];
  const rubric = isSample ? sampleProject.rubric : "";
  const tone = isSample ? sampleProject.tone : "professional";
  const minutes = isSample ? sampleProject.lengthSeconds / 60 : 2;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-page items-baseline justify-between px-6 pb-10 pt-10 sm:px-8">
        <div>
          <p className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            DemoScript
          </p>
          <p className="mt-1 text-[12.5px] text-muted">
            Turn your screenshots into a demo script.
          </p>
        </div>
        {isSample ? (
          <p className="text-[11.5px] text-faint">Sample project</p>
        ) : null}
      </header>

      <main className="mx-auto grid max-w-page grid-cols-1 gap-10 px-6 pb-20 sm:px-8 md:grid-cols-[45fr_55fr] md:gap-0">
        <section className="md:border-r md:border-hairline md:pr-10">
          <UploadColumn
            shots={shots}
            rubric={rubric}
            tone={tone}
            minutes={minutes}
            isSample={isSample}
            onClearSample={() => setView("empty")}
          />
        </section>

        <section className="md:pl-10">
          {isSample ? (
            <Storyboard
              scenes={sampleProject.scenes}
              shots={sampleProject.shots}
              criteria={sampleProject.criteria}
              lengthSeconds={sampleProject.lengthSeconds}
              redNotes={sampleRedNotes}
            />
          ) : (
            <SkeletonStoryboard onTrySample={() => setView("sample")} />
          )}
        </section>
      </main>
    </div>
  );
}
