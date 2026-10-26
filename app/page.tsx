"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ModeStrip, { type Mode } from "@/components/ModeStrip";
import RehearsalPanel from "@/components/RehearsalPanel";
import SkeletonStoryboard from "@/components/SkeletonStoryboard";
import Storyboard from "@/components/Storyboard";
import UploadColumn from "@/components/UploadColumn";
import VideoPlayer from "@/components/VideoPlayer";
import VoiceRecordingMode from "@/components/VoiceRecordingMode";
import StoryQuestions from "@/components/StoryQuestions";
import { normalizeContextAnswers, type ContextAnswer, type PendingStory, type StoryQuestion } from "@/lib/storyContext";
import {
  canFloatControls,
  openRecordingBar,
  type RecordingBar,
} from "@/lib/floatingBar";
import { DEFAULT_PRESET, isNarrator, isPreset, narratorFor } from "@/lib/presets";
import {
  MAX_RECORDING_SECONDS,
  beginRecording,
  inspectVideo,
  type RecordingSession,
} from "@/lib/recorder";
import { detectTimeLimit } from "@/lib/rubric";
import { clearSession, loadSession, saveSession } from "@/lib/sessionStore";
import { secondsFor } from "@/lib/timing";
import { EMPTY_BRIEF, hasStoryBrief, normalizeBrief, type ProjectBrief } from "@/lib/projectBrief";
import { isSampleSession, SAMPLE_BRIEF } from "@/lib/sampleDemo";
import type {
  Criterion,
  Narrator,
  Preset,
  Recording,
  Scene,
  ScenePatch,
  SceneTake,
} from "@/lib/types";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type ScriptPayload = {
  questions?: StoryQuestion[];
  writingError?: string;
  timingNote?: string;
  criteria: Criterion[];
  scenes: {
    visualDescription?: string;
    startSeconds: number;
    spokenLine: string;
    caption: string;
    covers: string[];
  }[];
};

const STAGE_LABEL: Record<string, string> = {
  reading: "Handing the clip to Gemini…",
  processing: "Gemini is watching the clip…",
  writing: "Writing the scenes…",
  correcting: "Checking the footage again to correct scene timings…",
  editing: "Connecting the scenes into one story…",
  context: "Checking what needs explanation before writing…",
};

/**
 * The route names each stage as it starts, so the bar can say what is actually
 * happening during a wait nothing on this side can measure.
 */
async function readScriptStream(
  response: Response,
  onStage: (label: string) => void,
): Promise<ScriptPayload> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The recording couldn't be read. Try again.");

  const decoder = new TextDecoder();
  let buffer = "";
  let payload: ScriptPayload | null = null;
  let failure: string | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const text = line.trim();
      if (!text) continue;
      let event: { type?: string; stage?: string; error?: string; script?: ScriptPayload };
      try {
        event = JSON.parse(text);
      } catch {
        continue;
      }
      if (event.type === "stage" && event.stage) {
        onStage(STAGE_LABEL[event.stage] ?? "Working…");
      } else if (event.type === "error") {
        failure = event.error ?? "The recording couldn't be read. Try again.";
      } else if (event.type === "done" && event.script) {
        payload = event.script;
      }
    }
  }

  if (failure) throw new Error(failure);
  if (!payload) throw new Error("The recording couldn't be read. Try again.");
  return payload;
}

export default function Page() {
  const [recording, setRecording] = useState<Recording | null>(null);
  const [recordingActive, setRecordingActive] = useState(false);
  const [recordingStarting, setRecordingStarting] = useState(false);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const [floating, setFloating] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const [rubric, setRubric] = useState("");
  const [brief, setBrief] = useState<ProjectBrief>(EMPTY_BRIEF);
  const [preset, setPreset] = useState<Preset>(DEFAULT_PRESET);
  const [narrator, setNarrator] = useState<Narrator>(narratorFor(DEFAULT_PRESET));
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingStory, setPendingStory] = useState<PendingStory | null>(null);
  const [contextAnswers, setContextAnswers] = useState<ContextAnswer[]>([]);

  const [script, setScript] = useState<{
    scenes: Scene[];
    criteria: Criterion[];
  } | null>(null);
  const [running, setRunning] = useState(false);
  const [flowWorking, setFlowWorking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const scriptRef = useRef(script);
  scriptRef.current = script;

  const [mode, setMode] = useState<Mode>("script");
  const [takes, setTakes] = useState<Map<string, SceneTake>>(new Map());
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [storageState, setStorageState] = useState<"saving" | "saved" | "failed">("saved");
  const [sessionReady, setSessionReady] = useState(false);
  const [sampleMode, setSampleMode] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [rewritingSceneId, setRewritingSceneId] = useState<string | null>(null);

  /** How long the last clip took to read, in seconds. Null until one has been. */
  const [readSeconds, setReadSeconds] = useState<number | null>(null);
  /** Ticks while the clip is being read, so the wait is a clock, not a spinner. */
  const [processingSeconds, setProcessingSeconds] = useState<number | null>(null);

  const playerRef = useRef<HTMLVideoElement | null>(null);
  const sampleInputRef = useRef<HTMLInputElement | null>(null);
  const recordingSessionRef = useRef<RecordingSession | null>(null);
  const recordingBarRef = useRef<RecordingBar | null>(null);
  const storedReadyRef = useRef(false);

  const clipUrl = useMemo(
    () => (recording ? URL.createObjectURL(recording.blob) : null),
    [recording],
  );

  useEffect(
    () => () => {
      if (clipUrl) URL.revokeObjectURL(clipUrl);
    },
    [clipUrl],
  );

  const activeScenes = script?.scenes ?? [];

  useEffect(
    () => () => {
      recordingSessionRef.current?.stop();
      recordingBarRef.current?.close();
      recordingBarRef.current = null;
    },
    [],
  );

  // Restore clip, script and narration together so ids and timing stay paired.
  useEffect(() => {
    let alive = true;
    if (isSampleSession(window.location.search)) {
      const controller = new AbortController();
      setSampleMode(true); setLoadingSample(true);
      // Deliberately bypass both IndexedDB restoration and its save-ready flag.
      void import("@/lib/loadSampleDemo").then(({ loadSampleDemo }) => loadSampleDemo(controller.signal))
        .then(sample => {
          if (!alive) return;
          setRecording(sample.recording); setScript({ scenes: sample.scenes, criteria: [] });
          setTakes(sample.takes); setBrief({ ...SAMPLE_BRIEF }); setPreset("hackathon"); setNarrator("we");
          setActiveSceneId(sample.scenes[0]?.id ?? null); setMode("script");
        }).catch(error => {
          if (alive && !controller.signal.aborted) setNotice(error instanceof Error ? error.message : "The sample could not be loaded. Your saved project is unchanged.");
        }).finally(() => { if (alive) { setLoadingSample(false); setSessionReady(true); } });
      return () => { alive = false; controller.abort(); };
    }
    void loadSession()
      .then((stored) => {
        if (!alive || !stored) return;
        setRecording(stored.recording);
        setTakes(new Map(stored.takes ?? []));
        setRubric(stored.rubric ?? "");
        setBrief(normalizeBrief(stored.brief));
        setPendingStory(stored.pendingStory ?? null);
        setContextAnswers(normalizeContextAnswers(stored.contextAnswers));
        const storedPreset = isPreset(stored.preset) ? stored.preset : DEFAULT_PRESET;
        setPreset(storedPreset);
        setNarrator(
          isNarrator(stored.narrator) ? stored.narrator : narratorFor(storedPreset),
        );
        if (stored.scenes.length > 0) {
          setScript({ scenes: stored.scenes, criteria: stored.criteria ?? [] });
        }
      })
      .finally(() => {
        storedReadyRef.current = true;
        if (alive) setSessionReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (sampleMode || !storedReadyRef.current || !recording) return;
    // Rewriting a multi-megabyte clip on every keystroke would be wasteful.
    let alive = true;
    setStorageState("saving");
    const timer = window.setTimeout(() => {
      void saveSession({
        recording,
        scenes: script?.scenes ?? [],
        criteria: script?.criteria ?? [],
        rubric,
        preset,
        narrator,
        takes: [...takes],
        brief,
        pendingStory,
        contextAnswers,
      }).then(() => { if (alive) setStorageState("saved"); })
        .catch(() => { if (alive) setStorageState("failed"); });
    }, 150);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [recording, script, rubric, preset, narrator, takes, sessionReady, brief, pendingStory, contextAnswers, sampleMode]);

  useEffect(() => {
    if (!voiceBusy && (storageState === "saved" || (!pendingStory && ![...takes.values()].some((take) => take.blob)))) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [voiceBusy, storageState, takes, pendingStory]);

  const protectTakes = useCallback(() => {
    if (voiceBusy || running || flowWorking) { setNotice("Finish the current recording or script first."); return false; }
    return ![...takes.values()].some((take) => take.blob) ||
      window.confirm("This replaces your recorded narration. Download it first if you want to keep it. Continue?");
  }, [takes, voiceBusy, running, flowWorking]);

  const stopRecording = useCallback(() => {
    recordingSessionRef.current?.stop();
  }, []);

  const removeRecording = useCallback(() => {
    if (!protectTakes()) return;
    recordingSessionRef.current?.stop();
    recordingSessionRef.current = null;
    recordingBarRef.current?.close();
    recordingBarRef.current = null;
    setRecording(null);
    setRecordingActive(false);
    setRecordingStarting(false);
    setRecordingPaused(false);
    setFloating(false);
    setElapsed(0);
    setScript(null);
    setPendingStory(null);
    setContextAnswers([]);
    setTakes(new Map());
    setReadSeconds(null);
    setActiveSceneId(null);
    setMode("script");
    if (!sampleMode) void clearSession();
  }, [protectTakes, sampleMode]);

  const startRecording = useCallback(async () => {
    if (recordingActive || recordingStarting) return;
    if (!protectTakes()) return;
    setNotice(null);
    setElapsed(0);
    setRecordingPaused(false);
    setRecordingStarting(true);

    try {
      const session = await beginRecording({
        onTick: (seconds, paused) => {
          setElapsed(seconds);
          setRecordingPaused(paused);
          recordingBarRef.current?.setClock(seconds, paused);
        },
        onFinish: (result) => {
          recordingSessionRef.current = null;
          recordingBarRef.current?.close();
          recordingBarRef.current = null;
          setFloating(false);
          setRecording(result);
          setScript(null);
          setPendingStory(null);
          setContextAnswers([]);
          setTakes(new Map());
          setReadSeconds(null);
          setActiveSceneId(null);
          setMode("script");
          setRecordingActive(false);
          setRecordingStarting(false);
          setRecordingPaused(false);
          setElapsed(0);
        },
      });
      recordingSessionRef.current = session;
      setRecordingActive(true);
      setRecordingStarting(false);

      if (canFloatControls()) {
        try {
          let opened: RecordingBar | null = null;
          const bar = await openRecordingBar({
            onStart: () => undefined,
            onCancel: () => recordingSessionRef.current?.stop(),
            onPause: () => recordingSessionRef.current?.pause(),
            onResume: () => recordingSessionRef.current?.resume(),
            onStop: () => recordingSessionRef.current?.stop(),
            onClose: () => {
              if (recordingBarRef.current === opened) recordingBarRef.current = null;
            },
          });
          opened = bar;
          if (recordingSessionRef.current !== session) {
            bar.close();
          } else {
            bar.setClock(session.elapsed(), session.paused());
            recordingBarRef.current = bar;
            setFloating(true);
          }
        } catch {
          // The strip in the page still has pause and stop.
        }
      }
    } catch (error) {
      setRecordingStarting(false);
      setRecordingPaused(false);
      setNotice(
        error instanceof Error
          ? error.message
          : "Screen recording didn't start. Upload a recording instead.",
      );
    }
  }, [recordingActive, recordingStarting, protectTakes]);

  const pauseRecording = useCallback(() => {
    recordingSessionRef.current?.pause();
  }, []);

  const resumeRecording = useCallback(() => {
    recordingSessionRef.current?.resume();
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

  /** A demo type brings its natural pronoun; the toggle can still overrule it. */
  const choosePreset = useCallback((next: Preset) => {
    setPreset(next);
    setNarrator(narratorFor(next));
  }, []);

  /** The script sets its own length; nothing here asks for a target up front. */
  const scriptSeconds = useMemo(
    () => recording?.durationSeconds ?? activeScenes.reduce((sum, scene) => sum + scene.seconds, 0),
    [activeScenes, recording],
  );

  const updateScene = useCallback((sceneId: string, patch: ScenePatch) => {
    setScript((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        scenes: previous.scenes.map((scene) => {
          if (scene.id !== sceneId) return scene;
          const next = { ...scene, ...patch };
          if (patch.spokenLine !== undefined && patch.covers === undefined) next.covers = [];
          // A recorded scene's length is the clip's, not the new line's.
          if (patch.spokenLine !== undefined && scene.startSeconds == null) {
            next.seconds = Math.max(1, secondsFor(next.spokenLine, "voice"));
          }
          return next;
        }),
      };
    });
  }, []);

  const rewriteScene = useCallback(
    async (sceneId: string) => {
      if (rewritingSceneId || flowWorking) return;
      const scene = script?.scenes.find((item) => item.id === sceneId);
      if (!scene) return;
      const sceneIndex = script!.scenes.indexOf(scene);

      if (!scene.description.trim() && !scene.caption.trim()) {
        setNotice("Add a note for this scene, then rewrite it.");
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
              brief,
              contextAnswers,
              beforeLine: script!.scenes[sceneIndex - 1]?.spokenLine ?? "",
              afterLine: script!.scenes[sceneIndex + 1]?.spokenLine ?? "",
              description: scene.visualDescription ?? scene.caption,
              note: scene.description,
              caption: scene.caption,
              previousLine: scene.spokenLine,
              seconds: scene.seconds,
              rubric,
              preset,
              narrator,
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
    [rewritingSceneId, script, rubric, preset, narrator, updateScene, brief, flowWorking, contextAnswers],
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
    setTakes((previous) => {
      const next = new Map(previous);
      next.delete(sceneId);
      return next;
    });
    setActiveSceneId((current) => (current === sceneId ? null : current));
  }, []);

  const setTake = useCallback((sceneId: string, take: SceneTake) => {
    setStorageState("saving");
    setTakes((previous) => {
      const next = new Map(previous);
      next.set(sceneId, take);
      return next;
    });
  }, []);

  const writeScript = useCallback(
    async (clip: Recording) => {
      if (running) return;
      if (!hasStoryBrief(brief)) {
        setNotice("Answer the first three project questions so the demo tells your story.");
        return;
      }

      setNotice(null);
      setRunning(true);
      setStatus("Sending the recording…");

      // The clock the page shows beside the bar: wall time, from the press.
      const began = performance.now();
      setProcessingSeconds(0);
      const clock = window.setInterval(() => {
        setProcessingSeconds((performance.now() - began) / 1000);
      }, 200);

      try {
        const form = new FormData();
        form.append("video", clip.blob, "recording.webm");
        form.append("rubric", rubric);
        form.append("brief", JSON.stringify(normalizeBrief(brief)));
        form.append("preset", preset);
        form.append("narrator", narrator);
        form.append("duration", String(clip.durationSeconds));

        const response = await fetch("/api/video", { method: "POST", body: form });

        // A refusal before the work starts (no key, no file) is plain JSON.
        if (!(response.headers.get("content-type") ?? "").includes("application/x-ndjson")) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? "The recording couldn't be read. Try again.");
        }

        const result = await readScriptStream(response, setStatus);

        const scenes: Scene[] = result.scenes.map((scene, index) => {
          const next = result.scenes[index + 1];
          const start = scene.startSeconds;
          const end = next ? next.startSeconds : clip.durationSeconds;
          return {
            id: newId(),
            spokenLine: scene.spokenLine,
            caption: scene.caption,
            description: "",
            visualDescription: scene.visualDescription,
            covers: scene.covers,
            seconds: end - start,
            startSeconds: start,
          };
        });

        if (result.questions?.length || result.writingError) {
          setPendingStory({ scenes, criteria: result.criteria, questions: result.questions ?? [], answers: {}, contextAnswers: [], writingError: result.writingError });
        } else {
          setScript({ scenes, criteria: result.criteria });
          setPendingStory(null);
        }
        setContextAnswers([]);
        if (result.timingNote) setNotice(result.timingNote);
        setTakes(new Map());
        setReadSeconds(Math.max(1, Math.round((performance.now() - began) / 1000)));
        setActiveSceneId(scenes[0]?.id ?? null);
        setMode("script");
      } catch (error) {
        setReadSeconds(null);
        setNotice(
          error instanceof Error
            ? error.message
            : "Something went wrong. Your recording is still here.",
        );
      } finally {
        window.clearInterval(clock);
        setProcessingSeconds(null);
        setRunning(false);
        setStatus(null);
      }
    },
    [narrator, preset, rubric, running, brief],
  );

  const generate = useCallback(() => {
    if (!recording) return;
    if (!protectTakes()) return;
    void writeScript(recording);
  }, [recording, writeScript, protectTakes]);

  const uploadRecording = useCallback(
    async (file: File, options?: { writeScript?: boolean }) => {
      if (!protectTakes()) return;
      if (recordingActive) {
        setNotice("Stop the recording first.");
        return;
      }
      setNotice(null);
      setInspecting(`Reading ${file.name}…`);
      try {
        const result = await inspectVideo(file);
        setRecording(result);
        setScript(null);
        setPendingStory(null);
        setContextAnswers([]);
        setTakes(new Map());
        setReadSeconds(null);
        setActiveSceneId(null);
        setMode("script");
        if (options?.writeScript) void writeScript(result);
      } catch (error) {
        setNotice(
          error instanceof Error ? error.message : "That recording couldn't be read.",
        );
      } finally {
        setInspecting(null);
      }
    },
    [recordingActive, writeScript, protectTakes],
  );

  const improveFlow = useCallback(async () => {
    if (!script || !recording || flowWorking || running || voiceBusy || rewritingSceneId) return;
    const snapshot = script;
    setFlowWorking(true); setNotice(null); setStatus("Checking context and developing scene explanations…");
    try {
      const response = await fetch("/api/story", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenes: snapshot.scenes, brief: normalizeBrief(brief), preset, narrator, contextAnswers }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Story editing failed. Your current script is unchanged.");
      if (scriptRef.current !== snapshot) throw new Error("Your script changed while the story was being edited. The new edits were kept; try Expand explanations again.");
      if (body.questions?.length) {
        setPendingStory({ ...snapshot, questions: body.questions, answers: {}, contextAnswers });
        setMode("script");
        return;
      }
      if (!Array.isArray(body.lines) || body.lines.length !== snapshot.scenes.length || body.lines.some((line: unknown, index: number) => typeof line !== "string" || (!line.trim() && snapshot.scenes[index].seconds >= 3))) throw new Error("The story edit was incomplete. Your current script is unchanged.");
      setScript({ ...snapshot, scenes: snapshot.scenes.map((scene, index) => ({ ...scene, spokenLine: body.lines[index] })) });
      setNotice("Explanations expanded to fit the scene durations. Video timing is unchanged. Takes with changed lines are kept and marked for re-recording.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Story editing failed. Your current script is unchanged."); }
    finally { setFlowWorking(false); setStatus(null); }
  }, [script, recording, flowWorking, running, voiceBusy, rewritingSceneId, brief, preset, narrator, contextAnswers]);

  const continueStory = useCallback(async () => {
    if (!pendingStory || flowWorking || running || !pendingStory.questions.every(item => pendingStory.answers[item.id]?.trim())) return;
    const snapshot = pendingStory;
    const answers = normalizeContextAnswers([...snapshot.contextAnswers, ...snapshot.questions.map(item => ({ question: item.question, answer: snapshot.answers[item.id] }))]);
    setFlowWorking(true); setNotice(null); setStatus("Writing explanations to fit your scene durations…");
    try {
      const response = await fetch("/api/story", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenes: snapshot.scenes, brief: normalizeBrief(brief), preset, narrator, contextAnswers: answers }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "The descriptive script did not finish. Your answers are kept.");
      if (body.questions?.length) {
        setPendingStory({ ...snapshot, questions: body.questions, answers: {}, contextAnswers: answers, writingError: undefined });
        return;
      }
      if (!Array.isArray(body.lines) || body.lines.length !== snapshot.scenes.length || body.lines.some((line: unknown) => typeof line !== "string")) throw new Error("The script was incomplete. Your answers are kept; please continue again.");
      setScript({ criteria: snapshot.criteria, scenes: snapshot.scenes.map((scene, index) => ({ ...scene, spokenLine: body.lines[index] })) });
      setContextAnswers(answers);
      setPendingStory(null);
      setActiveSceneId(snapshot.scenes[0]?.id ?? null);
      setMode("script");
      setNotice("Your descriptive script is ready. Each passage is sized to its video scene, including natural pauses.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Writing did not finish. Your recording and answers are kept."); }
    finally { setFlowWorking(false); setStatus(null); }
  }, [pendingStory, flowWorking, running, brief, preset, narrator]);

  if (!sessionReady) return <main className="p-8 text-[13px] text-muted" role="status">Restoring your session…</main>;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-page items-baseline justify-between px-6 pb-10 pt-10 sm:px-8">
        <div>
          <p className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            DemoScript
          </p>
          <p className="mt-1 text-[12.5px] text-muted">
            Turn your project’s story and screen recording into a professional demo.
          </p>
        </div>
        <div className="flex items-center gap-5">
        {!sampleMode ? <a href="/?sample=launchpad" target="_blank" rel="noopener" className="text-[12px] text-accent underline underline-offset-4">Sample demo</a> : null}
        <p className="text-[11.5px] text-faint">
          {preset === "hackathon"
            ? "Hackathon"
            : preset === "university"
              ? "University project"
              : preset === "client-pitch"
                ? "Client pitch"
                : "Portfolio"}
        </p>
        </div>
      </header>

      {sampleMode ? <aside className="mx-auto mb-6 max-w-page border-y border-hairline px-6 py-4 sm:px-8">
        <p className="text-[13px] text-ink">Launchpad sample · A real recording with a prepared script and voice</p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">Try the scenes, open Record to hear the narration, or create the finished video. This example makes no analysis or voice-generation requests unless you choose to regenerate. Sample changes reset on reload; your saved project is unchanged.</p>
        <a href="/" target="_blank" rel="noopener" className="mt-2 inline-block text-[12px] text-accent underline">Open your own project</a>
      </aside> : null}

      <main className="mx-auto grid max-w-page grid-cols-1 gap-10 px-6 pb-20 sm:px-8 md:grid-cols-[45fr_55fr] md:gap-0">
        <section className="md:border-r md:border-hairline md:pr-10">
          <UploadColumn
            recording={recording}
            recordingStarting={recordingStarting}
            recordingActive={recordingActive}
            recordingPaused={recordingPaused}
            elapsedSeconds={elapsed}
            limitSeconds={MAX_RECORDING_SECONDS}
            rubric={rubric}
            brief={brief}
            onBriefChange={setBrief}
            preset={preset}
            inspecting={inspecting}
            notice={notice}
            busy={running || flowWorking || loadingSample}
            awaitingAnswers={Boolean(pendingStory)}
            status={status}
            processingSeconds={processingSeconds}
            onStartRecording={() => void startRecording()}
            onPauseRecording={pauseRecording}
            onResumeRecording={resumeRecording}
            onStopRecording={stopRecording}
            onRemoveRecording={removeRecording}
            onUploadRecording={(file) => void uploadRecording(file)}
            onRubricChange={setRubric}
            onPresetChange={choosePreset}
            narrator={narrator}
            onNarratorChange={setNarrator}
            onGenerate={generate}
          />
        </section>

        <section className="md:pl-10">
          {script && script.scenes.length > 0 && !pendingStory ? (
            <ModeStrip mode={mode} onChange={(next) => {
              if (voiceBusy) { setNotice("Finish or cancel narration or export before switching modes."); return; }
              if (flowWorking) { setNotice("Wait for the story edit before switching modes."); return; }
              setMode(next);
            }} />
          ) : null}

          {mode === "record" && script ? (
            <VoiceRecordingMode
              scenes={activeScenes}
              takes={takes}
              onTakeChange={setTake}
              clip={recording}
              clipUrl={clipUrl}
              onBusyChange={setVoiceBusy}
            />
          ) : null}

          {mode === "rehearse" && script && script.scenes.length > 0 ? (
            <RehearsalPanel
              scenes={activeScenes}
              lengthSeconds={scriptSeconds}
              onExit={() => setMode("script")}
              clipUrl={clipUrl}
            />
          ) : null}

          {mode === "script" ? (
            <>
              {recording && clipUrl && (script || pendingStory) ? (
                <VideoPlayer
                  src={clipUrl}
                  scenes={pendingStory?.scenes ?? activeScenes}
                  durationSeconds={recording.durationSeconds}
                  activeSceneId={activeSceneId}
                  onActiveScene={setActiveSceneId}
                  videoRef={playerRef}
                />
              ) : null}
              {pendingStory ? <StoryQuestions pending={pendingStory} busy={flowWorking || running}
                onAnswer={(id, answer) => setPendingStory(previous => previous ? { ...previous, answers: { ...previous.answers, [id]: answer } } : previous)}
                onContinue={() => void continueStory()} /> : script ? (
                <Storyboard
                  scenes={activeScenes}
                  poster={recording?.posterDataUrl ?? null}
                  criteria={script.criteria}
                  readSeconds={readSeconds}
                  timelineSeconds={recording?.durationSeconds}
                  activeSceneId={activeSceneId}
                  onSeekScene={recording ? seekScene : undefined}
                  statedMinutes={statedMinutes}
                  editable
                  rewritingSceneId={rewritingSceneId}
                  onUpdateScene={updateScene}
                  onRewriteScene={(sceneId) => void rewriteScene(sceneId)}
                  onDeleteScene={deleteScene}
                  onImproveFlow={() => void improveFlow()}
                  improvingFlow={flowWorking || running || Boolean(rewritingSceneId)}
                />
              ) : (
                <SkeletonStoryboard
                  onTrySample={() => sampleInputRef.current?.click()}
                  busyLine={loadingSample ? "Loading the Launchpad sample…" : running ? status : null}
                />
              )}
            </>
          ) : null}
        </section>
      </main>
      {takes.size > 0 || pendingStory ? <p role="status" className="mx-auto max-w-page px-6 pb-6 text-[12px] text-muted">
        {voiceBusy ? "Narration or export is in progress. Finish or cancel it before leaving." : sampleMode ? "Sample changes stay in this tab and reset on reload. Your saved project is unchanged." : storageState === "saved" ? pendingStory ? "Video analysis and answers saved in this browser." : "Narration saved in this browser." : storageState === "saving" ? "Saving your work… Keep this page open." : "Your latest work could not be saved. Keep this page open and retry before leaving."}
      </p> : null}

      <input
        ref={sampleInputRef}
        type="file"
        accept="video/*,.webm,.mp4,.mov"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadRecording(file, { writeScript: true });
          event.target.value = "";
        }}
      />
    </div>
  );
}
