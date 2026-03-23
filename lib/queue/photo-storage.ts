"use client";

const DB_NAME = "bomba-aberta:queue-db";
const STORE_NAME = "photos";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeQueuePhoto(draftKey: string, file: File): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.put(file, draftKey);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueuePhoto(draftKey: string): Promise<File | null> {
  if (typeof window === "undefined") return null;
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const request = store.get(draftKey);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteQueuePhoto(draftKey: string): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.delete(draftKey);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearOldPhotos(validDraftKeys: string[]): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAllKeys();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const allKeys = request.result as string[];
      allKeys.forEach(key => {
        if (!validDraftKeys.includes(key)) {
          store.delete(key);
        }
      });
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}
