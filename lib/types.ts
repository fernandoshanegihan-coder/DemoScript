/** What kind of demo this is. The preset rewrites the script's voice and focus. */
export type Preset = "hackathon" | "university" | "client-pitch" | "portfolio";

/** Who speaks in the script: a solo builder, or a team presenting together. */
export type Narrator = "i" | "we";

export type Criterion = {
  id: string;
  label: string;
  source: string;
};

export type Scene = {
  id: string;
  spokenLine: string;
  caption: string;
  /** Grounded observation of this exact interval, separate from rewrite requests. */
  visualDescription?: string;
  /** A note for rewriting this one scene. Empty is normal. */
  description: string;
  covers: string[];
  seconds: number;
  /** The second in the clip where this scene begins. */
  startSeconds?: number;
};

/** The parts of a scene the student can change without another generation. */
export type ScenePatch = Partial<
  Pick<Scene, "spokenLine" | "caption" | "description" | "covers">
>;

export type Recording = {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
  posterDataUrl: string;
  createdAt: number;
};

/** A microphone recording or generated narration. */
export type TakeSource = "voice" | "tts";

export type TakeStatus = "empty" | "recorded" | "too-long" | "too-short";

/** One scene's narration. */
export type SceneTake = {
  /** The script this audio was recorded against; edits require a new take. */
  spokenLine?: string;
  blob: Blob | null;
  durationSeconds: number | null;
  source: TakeSource;
  status: TakeStatus;
  wpm: number | null;
  wpmOutOfRange: boolean;
};
