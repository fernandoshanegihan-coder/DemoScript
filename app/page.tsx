"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SkeletonStoryboard from "@/components/SkeletonStoryboard";
import Storyboard from "@/components/Storyboard";
import UploadColumn from "@/components/UploadColumn";
import { frameFromVideo, startScreenShare } from "@/lib/capture";
import { canFloatCapture, openFloatingBar, type FloatingBar } from "@/lib/floatingBar";
import { fileToDataUrl, isImage } from "@/lib/images";
import { sampleProject, sampleRedNotes } from "@/lib/sampleProject";
import { secondsFor } from "@/lib/timing";
import type {
  Analysis,
  Criterion,
  Scene,
  ScriptResult,
  Shot,
  Tone,
} from "@/lib/types";

const MAX_SHOTS = 6;

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function unreadLine(numbers: number[]): string {
  const list =
    numbers.length > 1
      ? `${numbers.slice(0, -1).join(", ")} and ${numbers[numbers.length - 1]}`
      : `${numbers[0]}`;
  return numbers.length > 1
    ? `I couldn't read screenshots ${list} — add a note for them, then try again.`
    : `I couldn't read screenshot ${list} — add a note for it, then try again.`;
}

export default function Page() {
  const [view, setView] = useState<"empty" | "sample">("empty");
  const [shots, setShots] = useState<Shot[]>([]);
  const [rubric, setRubric] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [minutes, setMinutes] = useState(2);
  const [notice, setNotice] = useState<string | null>(null);
  const [script, setScript] = useState<{
    scenes: Scene[];
    criteria: Criterion[];
  } | null>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [floating, setFloating] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const floatingRef = useRef<FloatingBar | null>(null);
  const captureRef = useRef<() => void>(() => undefined);
  const stopRef = useRef<() => void>(() => undefined);

  const isSample = view === "sample";

  const stopShare = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    floatingRef.current?.close();
    floatingRef.current = null;
    setFloating(false);
    setSharing(false);
  }, []);

  useEffect(() => stopShare, [stopShare]);

  const startShare = useCallback(async () => {
    setNotice(null);
    try {
      const stream = await startScreenShare();
      streamRef.current = stream;
      setSharing(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => undefined);
      }
      stream.getVideoTracks()[0]?.addEventListener("ended", () => stopShare());

      if (canFloatCapture()) {
        try {
          floatingRef.current = await openFloatingBar({
            onCapture: () => captureRef.current(),
            onStop: () => stopRef.current(),
          });
          floatingRef.current.setRemaining(MAX_SHOTS - shots.length);
          setFloating(true);
        } catch {
          // The in-page capture bar still works; nothing to report.
        }
      }
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Screen sharing was blocked. Use Choose screenshots instead.",
      );
    }
  }, [stopShare, shots.length]);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (shots.length >= MAX_SHOTS) {
      setNotice("6 at a time — that's already a full 3-minute script.");
      return;
    }
    const dataUrl = frameFromVideo(video);
    if (!dataUrl) {
      setNotice("That frame wasn't ready yet. Try again in a second.");
      return;
    }
    setShots((previous) =>
      previous.length >= MAX_SHOTS
        ? previous
        : [
            ...previous,
            {
              id: newId(),
              fileName: `capture-${previous.length + 1}.jpg`,
              dataUrl,
              note: "",
              actions: [],
            },
          ],
    );
  }, [shots.length]);

  captureRef.current = captureFrame;
  stopRef.current = stopShare;

  useEffect(() => {
    floatingRef.current?.setRemaining(MAX_SHOTS - shots.length);
  }, [shots.length]);

  const addFiles = useCallback(
    async (files: File[]) => {
      setNotice(null);
      const images = files.filter(isImage);

      if (images.length !== files.length) {
        setNotice("Only images can be used as screenshots.");
      }

      const room = MAX_SHOTS - shots.length;
      if (images.length > room) {
        setNotice("6 at a time — that's already a full 3-minute script.");
      }

      const accepted = images.slice(0, Math.max(0, room));
      if (accepted.length === 0) return;

      try {
        const next = await Promise.all(
          accepted.map(async (file) => ({
            id: newId(),
            fileName: file.name,
            dataUrl: await fileToDataUrl(file),
            note: "",
            actions: [],
          })),
        );
        setShots((previous) => [...previous, ...next].slice(0, MAX_SHOTS));
      } catch (error) {
        setNotice(
          error instanceof Error ? error.message : "That file couldn't be read.",
        );
      }
    },
    [shots.length],
  );

  const updateShot = useCallback((shotId: string, update: (shot: Shot) => Shot) => {
    setShots((previous) =>
      previous.map((shot) => (shot.id === shotId ? update(shot) : shot)),
    );
  }, []);

  const generate = useCallback(async () => {
    if (running || shots.length === 0) return;

    setNotice(null);
    setRunning(true);
    setStatus(
      `Reading ${shots.length} screenshot${shots.length === 1 ? "" : "s"}…`,
    );

    try {
      const analyzeResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: shots.map((shot) => ({ id: shot.id, dataUrl: shot.dataUrl })),
        }),
      });
      const analyzeBody = await analyzeResponse.json().catch(() => ({}));
      if (!analyzeResponse.ok) {
        throw new Error(
          analyzeBody.error ?? "The screenshots couldn't be read. Try again.",
        );
      }

      const analyses: Analysis[] = analyzeBody.results ?? [];
      const analysisById = new Map(analyses.map((item) => [item.shotId, item]));

      const descriptionByShot = new Map<string, string>();
      const unread: number[] = [];
      const requestShots: {
        shotId: string;
        actionId: string;
        description: string;
        note: string;
      }[] = [];

      shots.forEach((shot, index) => {
        const analysis = analysisById.get(shot.id);
        const read = analysis?.confident ? analysis.description.trim() : "";
        // The student's own note outranks the model's reading of the image.
        const description = read || shot.note.trim();

        if (!description) {
          unread.push(index + 1);
          return;
        }

        descriptionByShot.set(shot.id, description);
        const actions = shot.actions.filter((action) => action.note.trim());

        if (actions.length === 0) {
          requestShots.push({
            shotId: shot.id,
            actionId: "",
            description,
            note: shot.note,
          });
        } else {
          for (const action of actions) {
            requestShots.push({
              shotId: shot.id,
              actionId: action.id,
              description,
              note: action.note,
            });
          }
        }
      });

      if (requestShots.length === 0) {
        setNotice(
          "None of those screenshots could be read. Add a note to at least one, then try again.",
        );
        return;
      }

      setStatus("Writing scenes…");
      const scriptResponse = await fetch("/api/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shots: requestShots, rubric, tone, minutes }),
      });
      const scriptBody = await scriptResponse.json().catch(() => ({}));
      if (!scriptResponse.ok) {
        throw new Error(
          scriptBody.error ?? "The script didn't come through. Try again.",
        );
      }

      const result = scriptBody as ScriptResult;
      const scenes: Scene[] = result.scenes.map((scene) => ({
        id: newId(),
        shotId: scene.shotId,
        actionId: scene.actionId,
        spokenLine: scene.spokenLine,
        caption: scene.caption,
        description: descriptionByShot.get(scene.shotId) ?? "",
        covers: scene.covers,
        seconds: Math.max(1, secondsFor(scene.spokenLine)),
      }));

      setScript({ scenes, criteria: result.criteria });

      if (unread.length > 0) setNotice(unreadLine(unread));
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Something went wrong. Your screenshots are still here.",
      );
    } finally {
      setRunning(false);
      setStatus(null);
    }
  }, [minutes, rubric, running, shots, tone]);

  return (
    <div className="min-h-screen">
      <video ref={videoRef} muted playsInline className="hidden" aria-hidden />
      <header className="mx-auto flex max-w-page items-baseline justify-between px-6 pb-10 pt-10 sm:px-8">
        <div>
          <p className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            DemoScript
          </p>
          <p className="mt-1 text-[12.5px] text-muted">
            Turn your screenshots into a demo script.
          </p>
        </div>
        {isSample ? <p className="text-[11.5px] text-faint">Sample project</p> : null}
      </header>

      <main className="mx-auto grid max-w-page grid-cols-1 gap-10 px-6 pb-20 sm:px-8 md:grid-cols-[45fr_55fr] md:gap-0">
        <section className="md:border-r md:border-hairline md:pr-10">
          <UploadColumn
            shots={isSample ? sampleProject.shots : shots}
            rubric={isSample ? sampleProject.rubric : rubric}
            tone={isSample ? sampleProject.tone : tone}
            minutes={isSample ? sampleProject.lengthSeconds / 60 : minutes}
            isSample={isSample}
            maxShots={MAX_SHOTS}
            notice={notice}
            sharing={sharing && !floating}
            busy={running}
            status={status}
            onGenerate={() => void generate()}
            onStartShare={() => {
              if (isSample) {
                setView("empty");
                return;
              }
              void startShare();
            }}
            onStopShare={stopShare}
            onCaptureFrame={captureFrame}
            onAddFiles={addFiles}
            onRubricChange={setRubric}
            onToneChange={setTone}
            onMinutesChange={(next) => setMinutes(Math.min(3, Math.max(1, next)))}
            onNoteChange={(shotId, note) =>
              updateShot(shotId, (shot) => ({ ...shot, note }))
            }
            onAddAction={(shotId) =>
              updateShot(shotId, (shot) => ({
                ...shot,
                actions: [
                  ...shot.actions,
                  {
                    id: newId(),
                    note: "",
                  },
                ],
              }))
            }
            onActionNoteChange={(shotId, actionId, note) =>
              updateShot(shotId, (shot) => ({
                ...shot,
                actions: shot.actions.map((action) =>
                  action.id === actionId ? { ...action, note } : action,
                ),
              }))
            }
            onRemoveShot={(shotId) => {
              setShots((previous) => previous.filter((shot) => shot.id !== shotId));
              setScript((previous) =>
                previous
                  ? {
                      ...previous,
                      scenes: previous.scenes.filter((scene) => scene.shotId !== shotId),
                    }
                  : previous,
              );
            }}
            onReorder={(from, to) =>
              setShots((previous) => {
                const next = [...previous];
                const [moved] = next.splice(from, 1);
                next.splice(to, 0, moved);
                return next;
              })
            }
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
          ) : script ? (
            <Storyboard
              scenes={script.scenes}
              shots={shots}
              criteria={script.criteria}
              lengthSeconds={minutes * 60}
            />
          ) : (
            <SkeletonStoryboard
              onTrySample={() => setView("sample")}
              minutes={minutes}
              busyLine={running ? status : null}
            />
          )}
        </section>
      </main>
    </div>
  );
}
