"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import VoiceScene from "@/components/VoiceScene";
import NarrationExport from "@/components/NarrationExport";
import AutomaticNarration from "@/components/AutomaticNarration";
import { emptyTake, takeFrom } from "@/lib/voiceRecorder";
import type { Recording, Scene, SceneTake } from "@/lib/types";

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"];
const COUNTDOWN_STEP_MS = 650;

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const type of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function VoiceRecordingMode({
  scenes,
  takes,
  onTakeChange,
  clip,
  clipUrl,
  onBusyChange,
}: {
  scenes: Scene[];
  takes: Map<string, SceneTake>;
  onTakeChange: (sceneId: string, take: SceneTake) => void;
  clip: Recording | null;
  clipUrl: string | null;
  onBusyChange: (busy: boolean) => void;
}) {
  const [countdown, setCountdown] = useState(true);

  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const setSpeechBusy = useCallback((busy: boolean) => { setGenerating(busy); onBusyChange(busy); }, [onBusyChange]);
  const setExportBusy = useCallback((busy: boolean) => { setExporting(busy); onBusyChange(busy); }, [onBusyChange]);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const sceneRef = useRef<Scene | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const tickerRef = useRef<number | null>(null);
  const autoStopRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const mountedRef = useRef(true);
  const captureTokenRef = useRef(0);
  const pendingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackUrlRef = useRef<string | null>(null);

  const narrated = scenes.filter(scene => scene.spokenLine.trim());

  const cleanupCapture = useCallback(() => {
    pendingRef.current = false;
    onBusyChange(false);
    videoRef.current?.pause();
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (tickerRef.current !== null) {
      window.clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
    if (autoStopRef.current !== null) {
      window.clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    setLevel(0);
  }, [onBusyChange]);

  useEffect(() => {
    // StrictMode mounts, cleans up, then mounts again in development; reset the
    // flag here or every finished take is thrown away on the second mount.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      captureTokenRef.current++;
      cancelledRef.current = true;
      cleanupCapture();
      playerRef.current?.pause();
      if (playbackUrlRef.current) URL.revokeObjectURL(playbackUrlRef.current);
    };
  }, [cleanupCapture]);

  const stopVoice = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      captureTokenRef.current++;
      cancelledRef.current = true;
      cleanupCapture();
      setActiveSceneId(null);
      setCountdownValue(null);
      return;
    }
    recorder.stop();
  }, [cleanupCapture]);

  const startVoice = useCallback(
    async (scene: Scene) => {
      if (pendingRef.current) return;
      setError(null);
      cancelledRef.current = false;

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setError("This browser can't reach a microphone. Try a desktop browser.");
        return;
      }

      const token = ++captureTokenRef.current;
      pendingRef.current = true;
      onBusyChange(true);
      setActiveSceneId(scene.id);
      playerRef.current?.pause();
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = scene.startSeconds ?? 0;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch {
        if (token !== captureTokenRef.current) return;
        cleanupCapture(); setActiveSceneId(null);
        setError(
          "Microphone access was blocked. Allow it for this site in the browser, then press Record again.",
        );
        return;
      }

      if (!mountedRef.current || token !== captureTokenRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const mimeType = pickMimeType();
      if (!mimeType) {
        stream.getTracks().forEach((track) => track.stop());
        cleanupCapture(); setActiveSceneId(null);
        setError("This browser can't record audio.");
        return;
      }

      streamRef.current = stream;
      sceneRef.current = scene;
      setActiveSceneId(scene.id);
      setElapsedMs(0);

      if (countdown) {
        for (const value of [3, 2, 1]) {
          if (cancelledRef.current || token !== captureTokenRef.current) break;
          setCountdownValue(value);
          await delay(COUNTDOWN_STEP_MS);
        }
        if (token === captureTokenRef.current) setCountdownValue(null);
      }

      if (token !== captureTokenRef.current) return;
      if (cancelledRef.current || streamRef.current !== stream) {
        cleanupCapture();
        setActiveSceneId(null);
        setCountdownValue(null);
        return;
      }

      try {
      // Level meter, so silence and clipping are visible while speaking.
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctor) {
        const context = new Ctor();
        audioContextRef.current = context;
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);
        const data = new Float32Array(analyser.fftSize);

        const tick = () => {
          analyser.getFloatTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i += 1) sum += data[i] * data[i];
          setLevel(Math.min(1, Math.sqrt(sum / data.length) * 6));
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (token === captureTokenRef.current && event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        if (token !== captureTokenRef.current) return;
        const seconds = Math.max(0.5, (performance.now() - startedAtRef.current) / 1000);
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType,
        });

        cleanupCapture();
        if (!mountedRef.current) return;

        if (!cancelledRef.current && blob.size > 0) {
          const target = sceneRef.current;
          if (target) {
            onTakeChange(
              target.id,
              takeFrom(blob, seconds, "voice", target.spokenLine, target.seconds),
            );
          }
        }

        setActiveSceneId(null);
        setCountdownValue(null);
        setElapsedMs(0);
      };

      if (videoRef.current) {
        videoRef.current.currentTime = scene.startSeconds ?? 0;
        await videoRef.current.play();
      }
      if (token !== captureTokenRef.current || !mountedRef.current) return;
      startedAtRef.current = performance.now();
      recorder.start(250);

      tickerRef.current = window.setInterval(() => {
        setElapsedMs(performance.now() - startedAtRef.current);
      }, 100);

      const limit = Math.min(180_000, Math.max(8_000, scene.seconds * 2_000));
      autoStopRef.current = window.setTimeout(() => {
        if (recorderRef.current?.state === "recording") stopVoice();
      }, limit);
      } catch {
        cleanupCapture(); setActiveSceneId(null);
        setError("Recording or video playback could not start. Your previous take is still saved.");
      }
    },
    [cleanupCapture, countdown, onTakeChange, stopVoice, onBusyChange],
  );

  const cancelVoice = useCallback(() => {
    captureTokenRef.current++;
    cancelledRef.current = true;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    cleanupCapture();
    setActiveSceneId(null);
    setCountdownValue(null);
    setElapsedMs(0);
  }, [cleanupCapture]);

  const play = useCallback(
    (scene: Scene, take: SceneTake) => {
      if (!take.blob) return;
      playerRef.current?.pause();
      if (playbackUrlRef.current) URL.revokeObjectURL(playbackUrlRef.current);

      if (playingId === scene.id) {
        setPlayingId(null);
        return;
      }

      const url = URL.createObjectURL(take.blob);
      playbackUrlRef.current = url;
      const audio = new Audio(url);
      playerRef.current = audio;
      setPlayingId(scene.id);
      audio.onended = () => {
        setPlayingId(null);
        URL.revokeObjectURL(url);
      };
      void audio.play().catch(() => {
        setPlayingId(null);
        URL.revokeObjectURL(url);
      });
    },
    [playingId],
  );

  const remove = useCallback(
    (scene: Scene) => {
      if (!window.confirm("Delete this recorded take?")) return;
      playerRef.current?.pause();
      setPlayingId(null);
      onTakeChange(scene.id, emptyTake());
    },
    [onTakeChange],
  );

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-[13px] text-muted">Narrate, scene by scene</h2>
        <p className="mt-2 max-w-[34rem] text-[12.5px] leading-relaxed text-muted">
          Record your own voice or generate a voice to read the script. Each scene keeps its own take.
        </p>
      </div>

      <AutomaticNarration scenes={scenes} takes={takes} onTakeChange={onTakeChange} onBusyChange={setSpeechBusy} disabled={activeSceneId !== null || exporting} />

      {clipUrl ? <video ref={videoRef} src={clipUrl} muted playsInline preload="auto" className="mb-4 w-full bg-ink"
        onTimeUpdate={(event) => {
          const scene = sceneRef.current;
          if (scene && event.currentTarget.currentTime >= (scene.startSeconds ?? 0) + scene.seconds) event.currentTarget.pause();
        }} /> : null}

      <div className="mb-5 flex flex-wrap items-end gap-x-6 gap-y-3 border-y border-hairline py-3">
        <label className="flex items-center gap-2 text-[12px] text-muted">
          <input
            type="checkbox"
            checked={countdown}
            onChange={(event) => setCountdown(event.target.checked)}
            className="h-3.5 w-3.5 accent-accent"
          />
          3-2-1 countdown
        </label>

        <p className="ml-auto text-[11.5px] tabular-nums text-faint">
          {narrated.filter(scene => takes.get(scene.id)?.blob).length} of {narrated.length} ready
        </p>
      </div>

      {error ? (
        <div className="mb-4 border-l border-flag pl-3">
          <p className="text-[12.5px] leading-relaxed text-flag">{error}</p>
          <p className="mt-1 text-[11.5px] text-muted">
            Nothing already recorded was lost. Allow the microphone, then try
            again.
          </p>
        </div>
      ) : null}

      <div className="border-t border-hairline">
        {scenes.map((scene, index) => (
          <VoiceScene
            key={scene.id}
            scene={scene}
            index={index}
            take={takes.get(scene.id) ?? emptyTake()}
            recording={activeSceneId === scene.id}
            elapsedMs={activeSceneId === scene.id ? elapsedMs : 0}
            level={activeSceneId === scene.id ? level : 0}
            countdown={activeSceneId === scene.id ? countdownValue : null}
            playing={playingId === scene.id}
            disabled={activeSceneId !== null || exporting || generating}
            onStartVoice={() => void startVoice(scene)}
            onStopVoice={stopVoice}
            onCancelVoice={cancelVoice}
            onPlay={() => play(scene, takes.get(scene.id) ?? emptyTake())}
            onDelete={() => remove(scene)}
          />
        ))}
      </div>

      {clip && clipUrl ? (
        <div className="mt-6">
          <NarrationExport scenes={scenes} takes={takes} clip={clip} clipUrl={clipUrl} disabled={activeSceneId !== null || generating} onBusyChange={setExportBusy} />
        </div>
      ) : null}
    </div>
  );
}
