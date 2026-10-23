export type Tone = "professional" | "energetic" | "storytelling";

export type Action = {
  id: string;
  note: string;
};

export type Shot = {
  id: string;
  fileName: string;
  dataUrl: string;
  note: string;
  actions: Action[];
};

export type Analysis = {
  shotId: string;
  description: string;
  elements: string[];
  confident: boolean;
};

export type Criterion = {
  id: string;
  label: string;
  source: string;
};

export type Scene = {
  id: string;
  shotId: string;
  actionId: string;
  spokenLine: string;
  caption: string;
  description: string;
  covers: string[];
  seconds: number;
};

export type SampleProject = {
  shots: Shot[];
  scenes: Scene[];
  criteria: Criterion[];
  rubric: string;
  lengthSeconds: number;
  tone: Tone;
};
