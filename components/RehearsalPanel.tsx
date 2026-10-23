"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatClock,
  rehearsalSummary,
  sceneIndexAt,
} from "@/lib/timing";
import type { Scene } from "@/lib/types";

const quiet =
  "text-[12px] text-muted underline decoration-hairline underline-offset-4 hover:text-ink hover:decoration-accent";
const primary =
  "bg-accent px-4 py-2 text-[12.5px] text-paper transition-opacity hover:opacity-90";

/**
 * The clock, the current scene, and nothing else. Timing lives here; the page
 * only decides when to show it. No camera, no microphone, no storage.
 */
export default function RehearsalPanel({
  scenes,
  lengthSeconds,
  onExit,
}: {
  scenes: Scene[];
  lengthSeconds: number;
  onExit: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const baseRef = useRef(0);
  const segmentStartRef = useRef(0);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());

  const target = Math.max(1, lengthSeconds);
  const durations = scenes.map((scene) => scene.seconds);
  const activeIndex = sceneIndexAt(durations, elapsed);
  const activeId = activeIndex >= 0 ? scenes[activeIndex]?.id : null;
  const remaining = Math.max(0, target - elapsed);
  const over = elapsed > target;
  const percent = Math.min(100, (elapsed / target) * 100);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setElapsed(
        baseRef.current + (performance.now() - segmentStartRef.current) / 1000,
      );
    }, 250);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!activeId) return;
    itemRefs.current
      .get(activeId)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeId]);

  function start() {
    baseRef.current = 0;
    segmentStartRef.current = performance.now();
    setElapsed(0);
    setSummary(null);
    setRunning(true);
  }

  function pause() {
    if (!running) return;
    const value =
      baseRef.current + (performance.now() - segmentStartRef.current) / 1000;
    baseRef.current = value;
    setElapsed(value);
    setRunning(false);
  }

  function resume() {
    segmentStartRef.current = performance.now();
    setRunning(true);
  }

  function stop() {
    let value = baseRef.current;
    if (running) {
      value =
        baseRef.current + (performance.now() - segmentStartRef.current) / 1000;
      baseRef.current = value;
      setRunning(false);
    }
    setElapsed(value);
    setSummary(rehearsalSummary(value, target));
  }

  const started = running || elapsed > 0;

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-1 bg-paper/95 px-1 pb-4 pt-1 backdrop-blur-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">
              Rehearsal · scene {Math.max(1, activeIndex + 1)} of {scenes.length}
            </p>
            <p
              className={`mt-1.5 font-script text-[34px] leading-none tabular-nums ${
                over ? "text-flag" : "text-ink"
              }`}
            >
              {over ? formatClock(elapsed - target) : formatClock(remaining)}
            </p>
            <p className="mt-1.5 text-[11.5px] text-muted">
              {over
                ? `over a ${formatClock(target)} script`
                : `left of ${formatClock(target)}`}
            </p>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            {!started && !summary ? (
              <button type="button" onClick={start} className={primary}>
                Start reading
              </button>
            ) : null}
            {running ? (
              <button type="button" onClick={pause} className={quiet}>
                Pause
              </button>
            ) : null}
            {!running && started && !summary ? (
              <button type="button" onClick={resume} className={quiet}>
                Resume
              </button>
            ) : null}
            {started && !summary ? (
              <button type="button" onClick={stop} className={quiet}>
                Stop
              </button>
            ) : null}
            {summary ? (
              <button type="button" onClick={start} className={primary}>
                Start again
              </button>
            ) : null}
            <button type="button" onClick={onExit} className={quiet}>
              Back to script
            </button>
          </div>
        </div>

        <div className="mt-3 h-px w-full bg-hairline">
          <div
            className={`h-px transition-[width] duration-200 ${
              over ? "bg-flag" : "bg-accent"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>

        {summary ? (
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink">{summary}</p>
        ) : !started ? (
          <p className="mt-3 text-[12px] leading-relaxed text-muted">
            The clock starts when you do. Scene one is marked, and the page keeps
            your place as you read.
          </p>
        ) : null}
      </div>

      <ol className="border-t border-hairline">
        {scenes.map((scene, index) => {
          const active = index === activeIndex;
          return (
            <li
              key={scene.id}
              ref={(element) => {
                if (element) itemRefs.current.set(scene.id, element);
                else itemRefs.current.delete(scene.id);
              }}
              aria-current={active ? "step" : undefined}
              className={`border-b border-hairline py-5 transition-opacity duration-300 ${
                active ? "bg-white/55" : "opacity-40"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-[7px] w-5 shrink-0 text-[11px] tabular-nums ${
                    active ? "text-accent" : "text-faint"
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-script text-[19px] leading-[1.7] text-ink">
                    {scene.spokenLine}
                  </p>
                  {scene.caption ? (
                    <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
                      {scene.caption}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
