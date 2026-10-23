"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SkeletonStoryboard from "@/components/SkeletonStoryboard";
import Storyboard from "@/components/Storyboard";
import UploadColumn from "@/components/UploadColumn";
import VideoPlayer from "@/components/VideoPlayer";
import { frameFromVideo, startScreenShare } from "@/lib/capture";
import { canFloatCapture, openFloatingBar, type FloatingBar } from "@/lib/floatingBar";
import { fileToDataUrl, isImage } from "@/lib/images";
import { beginRecording, MAX_RECORDING_SECONDS, type RecordingSession } from "@/lib/recorder";
import { sampleProject, sampleRedNotes } from "@/lib/sampleProject";
import { detectTimeLimit } from "@/lib/rubric";
import { clearSession, loadSession, saveSession } from "@/lib/sessionStore";
import { secondsFor } from "@/lib/timing";
import type {
  Analysis,
  Criterion,
  Recording,
  Scene,
  ScenePatch,
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
  const [recording, setRecording] = useState<Recording | null>(null);
  const [recordingActive, setRecordingActive] = useState(false);
  const [recordingStarting, setRecordingStarting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [rewritingSceneId, setRewritingSceneId] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureVideoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const recordingSessionRef = useRef<RecordingSession | null>(null);
  const storedReadyRef = useRef(false);
  const floatingRef = useRef<FloatingBar | null>(null);
  const captureRef = useRef<() => void>(() => undefined);
  const stopRef = useRef<() => void>(() => undefined);

  const isSample = view === "sample";

  const stopShare = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (captureVideoRef.current) captureVideoRef.current.srcObject = null;
    floatingRef.current?.close();
    floatingRef.current = null;
    setFloating(false);
    setSharing(false);
  }, []);

  useEffect(() => stopShare, [stopShare]);

  useEffect(
    () => () => {
      recordingSessionRef.current?.stop();
    },
    [],
  );

  const recordingUrl = useMemo(
    () => (recording ? URL.createObjectURL(recording.blob) : null),
    [recording],
  );

  useEffect(
    () => () => {
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    },
    [recordingUrl],
  );

  // A clip and its script outlive a reload. Nothing else does.
  useEffect(() => {
    let alive = true;
    void loadSession()
      .then((stored) => {
        if (!alive || !stored) return;
        setRecording(stored.recording);
        setRubric(stored.rubric ?? "");
        setTone(stored.tone ?? "professional");
        setMinutes(stored.minutes ?? 2);
        if (stored.scenes.length > 0) {
          setScript({ scenes: stored.scenes, criteria: stored.criteria ?? [] });
        }
      })
      .finally(() => {
        storedReadyRef.current = true;
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!storedReadyRef.current || !recording) return;
    // Rewriting a multi-megabyte clip on every keystroke would be wasteful.
    const timer = window.setTimeout(() => {
      void saveSession({
        recording,
        scenes: script?.scenes ?? [],
        criteria: script?.criteria ?? [],
        rubric,
        tone,
        minutes,
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [recording, script, rubric, tone, minutes]);

  const startShare = useCallback(async () => {
    setNotice(null);
    try {
      const stream = await startScreenShare();
      streamRef.current = stream;
      setSharing(true);
      if (captureVideoRef.current) {
        captureVideoRef.current.srcObject = stream;
        void captureVideoRef.current.play().catch(() => undefined);
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
    const video = captureVideoRef.current;
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

  const startRecording = useCallback(async () => {
    if (recordingActive || recordingStarting) return;
    setNotice(null);
    setElapsed(0);
    setRecordingStarting(true);

    try {
      const session = await beginRecording({
        onTick: (seconds) => setElapsed(seconds),
        onFinish: (result) => {
          recordingSessionRef.current = null;
          setRecording(result);
          setScript(null);
          setActiveSceneId(null);
          setRecordingActive(false);
          setRecordingStarting(false);
          setElapsed(0);
        },
      });
      recordingSessionRef.current = session;
      setRecordingActive(true);
      setRecordingStarting(false);
    } catch (error) {
      setRecordingStarting(false);
      setNotice(
        error instanceof Error
          ? error.message
          : "Screen recording didn't start. Drop screenshots instead.",
      );
    }
  }, [recordingActive, recordingStarting]);

  const stopRecording = useCallback(() => {
    recordingSessionRef.current?.stop();
  }, []);

  const removeRecording = useCallback(() => {
    recordingSessionRef.current?.stop();
    recordingSessionRef.current = null;
    setRecording(null);
    setRecordingActive(false);
    setRecordingStarting(false);
    setElapsed(0);
    setScript(null);
    setActiveSceneId(null);
    void clearSession();
  }, []);

  const seekScene = useCallback((scene: Scene) => {
    const player = playerRef.current;
    if (player) {
      player.currentTime = scene.startSeconds ?? 0;
      void player.play().catch(() => undefined);
    }
    setActiveSceneId(scene.id);
  }, []);

  const statedMinutes = useMemo(() => detectTimeLimit(rubric), [rubric]);

  const updateScene = useCallback((sceneId: string, patch: ScenePatch) => {
    setScript((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        scenes: previous.scenes.map((scene) => {
          if (scene.id !== sceneId) return scene;
          const next = { ...scene, ...patch };
          // A recorded scene's length is the clip's, not the new line's.
          if (patch.spokenLine !== undefined && scene.startSeconds == null) {
            next.seconds = Math.max(1, secondsFor(next.spokenLine));
          }
          return next;
        }),
      };
    });
  }, []);

  const rewriteScene = useCallback(
    async (sceneId: string) => {
      if (rewritingSceneId) return;
      const scene = script?.scenes.find((item) => item.id === sceneId);
      if (!scene) return;

      const shot = shots.find((item) => item.id === scene.shotId);
      if (!scene.description.trim() && !shot?.note.trim()) {
        setNotice("Add what this screen shows, then rewrite the scene.");
        return;
      }

      setNotice(null);
      setRewritingSceneId(sceneId);
      try {
        const response = await fetch("/api/script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rewrite: {
              description: scene.description,
              note: shot?.note ?? "",
              previousLine: scene.spokenLine,
              seconds: scene.seconds,
              rubric,
              tone,
              criteria: (script?.criteria ?? []).map(({ id, label }) => ({
                id,
                label,
              })),
            },
          }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body.error ?? "That scene wasn't rewritten. Try again.");
        }

        const rewritten = body as {
          spokenLine: string;
          caption: string;
          covers: string[];
        };
        updateScene(sceneId, {
          spokenLine: rewritten.spokenLine,
          caption: rewritten.caption,
          covers: rewritten.covers,
        });
      } catch (error) {
        setNotice(
          error instanceof Error
            ? error.message
            : "That scene wasn't rewritten. Try again.",
        );
      } finally {
        setRewritingSceneId(null);
      }
    },
    [rewritingSceneId, script, shots, rubric, tone, updateScene],
  );

  const deleteScene = useCallback((sceneId: string) => {
    setScript((previous) =>
      previous
        ? {
            ...previous,
            scenes: previous.scenes.filter((scene) => scene.id !== sceneId),
          }
        : previous,
    );
    setActiveSceneId((current) => (current === sceneId ? null : current));
  }, []);


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
    if (running || (shots.length === 0 && !recording)) return;

    setNotice(null);
    setRunning(true);
    setStatus(
      recording
        ? "Sending the recording…"
        : `Reading ${shots.length} screenshot${shots.length === 1 ? "" : "s"}…`,
    );

    try {
      if (recording) {
        const form = new FormData();
        form.append("video", recording.blob, "recording.webm");
        form.append("rubric", rubric);
        form.append("tone", tone);
        form.append("minutes", String(minutes));
        form.append("duration", String(recording.durationSeconds));

        const videoResponse = await fetch("/api/video", { method: "POST", body: form });
        const videoBody = await videoResponse.json().catch(() => ({}));
        if (!videoResponse.ok) {
          throw new Error(
            videoBody.error ?? "The recording couldn't be read. Try again.",
          );
        }

        const result = videoBody as {
          criteria: Criterion[];
          scenes: {
            startSeconds: number;
            spokenLine: string;
            caption: string;
            covers: string[];
          }[];
        };

        const scenes: Scene[] = result.scenes.map((scene, index) => {
          const next = result.scenes[index + 1];
          const start = scene.startSeconds;
          const end = next ? next.startSeconds : recording.durationSeconds;
          return {
            id: newId(),
            shotId: "recording",
            actionId: "",
            spokenLine: scene.spokenLine,
            caption: scene.caption,
            description: "",
            covers: scene.covers,
            seconds: Math.max(1, Math.round(end - start)),
            startSeconds: start,
          };
        });

        setScript({ scenes, criteria: result.criteria });
        setActiveSceneId(scenes[0]?.id ?? null);
        return;
      }

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
  }, [minutes, recording, rubric, running, shots, tone]);

  const storyboardShots: Shot[] = recording
    ? [
        {
          id: "recording",
          fileName: "recording.webm",
          dataUrl: recording.posterDataUrl,
          note: "Screen recording",
          actions: [],
        },
      ]
    : shots;

  return (
    <div className="min-h-screen">
      <video ref={captureVideoRef} muted playsInline className="hidden" aria-hidden />
      <header className="mx-auto flex max-w-page items-baseline justify-between px-6 pb-10 pt-10 sm:px-8">
        <div>
          <p className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            DemoScript
          </p>
          <p className="mt-1 text-[12.5px] text-muted">
            Turn your screenshots or a screen recording into a demo script.
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
            recorded={
              isSample
                ? null
                : recording
                  ? {
                      posterDataUrl: recording.posterDataUrl,
                      durationSeconds: recording.durationSeconds,
                    }
                  : null
            }
            recordingStarting={recordingStarting}
            recording={recordingActive}
            elapsedSeconds={elapsed}
            limitSeconds={MAX_RECORDING_SECONDS}
            onStartRecording={() => {
              if (isSample) {
                setView("empty");
                return;
              }
              void startRecording();
            }}
            onStopRecording={stopRecording}
            onRemoveRecording={removeRecording}
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
              statedMinutes={detectTimeLimit(sampleProject.rubric)}
            />
          ) : (
            <>
              {recording && recordingUrl && script ? (
                <VideoPlayer
                  src={recordingUrl}
                  scenes={script.scenes}
                  durationSeconds={recording.durationSeconds}
                  activeSceneId={activeSceneId}
                  onActiveScene={setActiveSceneId}
                  videoRef={playerRef}
                />
              ) : null}
              {script ? (
                <Storyboard
                  scenes={script.scenes}
                  shots={storyboardShots}
                  criteria={script.criteria}
                  lengthSeconds={minutes * 60}
                  activeSceneId={activeSceneId}
                  onSeekScene={recording ? seekScene : undefined}
                  statedMinutes={statedMinutes}
                  editable
                  rewritingSceneId={rewritingSceneId}
                  onUpdateScene={updateScene}
                  onRewriteScene={(sceneId) => void rewriteScene(sceneId)}
                  onDeleteScene={deleteScene}
                />
              ) : (
                <SkeletonStoryboard
                  onTrySample={() => setView("sample")}
                  minutes={minutes}
                  busyLine={running ? status : null}
                />
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
