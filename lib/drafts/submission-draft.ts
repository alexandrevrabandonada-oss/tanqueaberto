import type { FuelType } from "@/lib/types";

export type SubmissionDraftStep = "photo" | "station" | "fuel" | "price" | "nickname" | "submit";
export type SubmissionDraftStatus = "in_progress" | "submitting" | "failed" | "completed";

export interface SubmissionDraftSnapshot {
  key: string;
  stationId: string;
  fuelType: FuelType;
  price: string;
  nickname: string;
  status: SubmissionDraftStatus;
  lastStep: SubmissionDraftStep;
  updatedAt: string;
  photoName?: string | null;
  photoType?: string | null;
  photoSize?: number | null;
  photo?: Blob | null;
}

const DB_NAME = "bomba-aberta-submission-drafts";
const DB_VERSION = 1;
const STORE_NAME = "drafts";
const DRAFT_TTL_MS = 8 * 60 * 60 * 1000;

function supportsIndexedDB() {
  return typeof indexedDB !== "undefined";
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!supportsIndexedDB()) {
      reject(new Error("indexeddb_unavailable"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("indexeddb_failed"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function runTransaction<T>(mode: IDBTransactionMode, callback: (store: IDBObjectStore) => Promise<T> | T) {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    Promise.resolve(callback(store))
      .then((value) => {
        transaction.oncomplete = () => {
          db.close();
          resolve(value);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error ?? new Error("indexeddb_transaction_failed"));
        };
      })
      .catch((error) => {
        db.close();
        reject(error);
      });
  });
}

export async function saveSubmissionDraft(snapshot: SubmissionDraftSnapshot) {
  if (!supportsIndexedDB()) {
    return false;
  }

  await runTransaction("readwrite", (store) => store.put(snapshot));
  return true;
}

export async function loadSubmissionDraft(key: string) {
  if (!supportsIndexedDB()) {
    return null;
  }

  const snapshot = await runTransaction<SubmissionDraftSnapshot | null>("readonly", (store) => {
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onerror = () => reject(request.error ?? new Error("indexeddb_read_failed"));
      request.onsuccess = () => resolve((request.result as SubmissionDraftSnapshot | undefined) ?? null);
    });
  });

  if (!snapshot) {
    return null;
  }

  const age = Date.now() - new Date(snapshot.updatedAt).getTime();
  if (!Number.isFinite(age) || age > DRAFT_TTL_MS) {
    await clearSubmissionDraft(key);
    return null;
  }

  return snapshot;
}

export async function clearSubmissionDraft(key: string) {
  if (!supportsIndexedDB()) {
    return false;
  }

  await runTransaction("readwrite", (store) => store.delete(key));
  return true;
}

export function getSubmissionDraftTtlMs() {
  return DRAFT_TTL_MS;
}
