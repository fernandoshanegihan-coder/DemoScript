import type { Criterion, Recording, Scene, Tone } from "@/lib/types";

export type StoredSession = {
  recording: Recording;
  scenes: Scene[];
  criteria: Criterion[];
  rubric: string;
  tone: Tone;
  minutes: number;
};

const DB_NAME = "demoscript";
const DB_VERSION = 1;
const STORE = "session";
const KEY = "current";

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
  if (!usable()) return null;
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = run(transaction.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Storage failed"));
    });
  } finally {
    db.close();
  }
}

/** The clip and its script live in this browser tab, under one key. */
export async function saveSession(session: StoredSession): Promise<void> {
  try {
    await withStore("readwrite", (store) => store.put(session, KEY));
  } catch {
    // Private browsing and full disks happen. The page keeps working.
  }
}

export async function loadSession(): Promise<StoredSession | null> {
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
  try {
    await withStore("readwrite", (store) => store.delete(KEY));
  } catch {
    // Nothing to clear, or storage is unavailable.
  }
}
