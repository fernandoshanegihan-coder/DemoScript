import type { Criterion, Narrator, Preset, Recording, Scene, SceneTake } from "@/lib/types";
import type { ProjectBrief } from "@/lib/projectBrief";
import type { ContextAnswer, PendingStory } from "@/lib/storyContext";
import { isSampleSession } from "./sampleDemo.ts";

function samplePreview(): boolean {
  return typeof window !== "undefined" && isSampleSession(window.location.search);
}

export type StoredSession = {
  recording: Recording;
  scenes: Scene[];
  criteria: Criterion[];
  rubric: string;
  preset: Preset;
  narrator?: Narrator;
  takes?: [string, SceneTake][];
  brief?: ProjectBrief;
  pendingStory?: PendingStory | null;
  contextAnswers?: ContextAnswer[];
};

const DB_NAME = "demoscript";
const DB_VERSION = 1;
const STORE = "session";
const KEY = "current";
let writes: Promise<unknown> = Promise.resolve();

function queueWrite(run: () => Promise<unknown>): Promise<void> {
  const next = writes.catch(() => undefined).then(run);
  writes = next;
  return next.then(() => undefined);
}

function usable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Storage unavailable"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  if (!usable()) throw new Error("Browser storage is unavailable.");
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = run(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error ?? new Error("Storage failed"));
      request.onerror = () => reject(request.error ?? new Error("Storage failed"));
    });
  } finally {
    db.close();
  }
}

/** The clip and its script live in this browser tab, under one key. */
export async function saveSession(session: StoredSession): Promise<void> {
  if (samplePreview()) return;
  await queueWrite(() => withStore("readwrite", (store) => store.put(session, KEY)));
}

export async function loadSession(): Promise<StoredSession | null> {
  if (samplePreview()) return null;
  try {
    const value = await withStore<StoredSession | undefined>("readonly", (store) =>
      store.get(KEY),
    );
    if (!value || !value.recording || !(value.recording.blob instanceof Blob)) return null;
    return value;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  if (samplePreview()) return;
  try {
    await queueWrite(() => withStore("readwrite", (store) => store.delete(KEY)));
  } catch {
    // Nothing to clear, or storage is unavailable.
  }
}
