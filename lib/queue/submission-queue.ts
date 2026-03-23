import type { Route } from "next";

import type { FuelType } from "@/lib/types";

export type SubmissionQueueStatus = "pending" | "retryable" | "needs_photo";

export interface SubmissionQueueEntry {
  id: string;
  draftKey: string;
  stationId: string;
  stationName: string;
  city: string;
  neighborhood: string | null;
  fuelType: FuelType;
  price: string;
  nickname: string;
  status: SubmissionQueueStatus;
  hasPhoto: boolean;
  photoName: string | null;
  photoType: string | null;
  photoSize: number | null;
  lastErrorCode: string | null;
  lastErrorLabel: string | null;
  attempts: number;
  returnToHref: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionQueueEntryInput {
  draftKey: string;
  stationId: string;
  stationName: string;
  city: string;
  neighborhood?: string | null;
  fuelType: FuelType;
  price: string;
  nickname: string;
  status: SubmissionQueueStatus;
  hasPhoto: boolean;
  photoName?: string | null;
  photoType?: string | null;
  photoSize?: number | null;
  lastErrorCode?: string | null;
  lastErrorLabel?: string | null;
  attempts?: number;
  returnToHref?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const STORAGE_KEY = "bomba-aberta:submission-queue";
const QUEUE_TTL_MS = 12 * 60 * 60 * 1000;

function supportsStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParse<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function isFresh(updatedAt: string) {
  const age = Date.now() - new Date(updatedAt).getTime();
  return Number.isFinite(age) && age <= QUEUE_TTL_MS;
}

function normalizeEntry(entry: SubmissionQueueEntry): SubmissionQueueEntry | null {
  if (!entry.draftKey || !entry.stationId || !entry.stationName || !entry.city || !entry.fuelType || !entry.price) {
    return null;
  }

  if (!isFresh(entry.updatedAt)) {
    return null;
  }

  return {
    ...entry,
    id: entry.id || entry.draftKey,
    neighborhood: entry.neighborhood ?? null,
    photoName: entry.photoName ?? null,
    photoType: entry.photoType ?? null,
    photoSize: typeof entry.photoSize === "number" ? entry.photoSize : null,
    lastErrorCode: entry.lastErrorCode ?? null,
    lastErrorLabel: entry.lastErrorLabel ?? null,
    attempts: Number.isFinite(entry.attempts) ? entry.attempts : 0,
    returnToHref: entry.returnToHref ?? null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt
  };
}

function sortQueue(entries: SubmissionQueueEntry[]) {
  return [...entries].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

async function readQueue(): Promise<SubmissionQueueEntry[]> {
  if (!supportsStorage()) {
    return [];
  }

  const parsed = safeParse<SubmissionQueueEntry[]>(window.localStorage.getItem(STORAGE_KEY)) ?? [];
  return sortQueue(parsed.map(normalizeEntry).filter((item): item is SubmissionQueueEntry => Boolean(item)));
}

async function writeQueue(entries: SubmissionQueueEntry[]) {
  if (!supportsStorage()) {
    return [];
  }

  const next = sortQueue(entries.map(normalizeEntry).filter((item): item is SubmissionQueueEntry => Boolean(item)));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function loadSubmissionQueue() {
  return readQueue();
}

export async function upsertSubmissionQueueEntry(input: SubmissionQueueEntryInput) {
  const current = await readQueue();
  const timestamp = input.updatedAt ?? new Date().toISOString();
  const existing = current.find((entry) => entry.draftKey === input.draftKey);
  const nextEntry: SubmissionQueueEntry = {
    id: existing?.id ?? input.draftKey,
    draftKey: input.draftKey,
    stationId: input.stationId,
    stationName: input.stationName,
    city: input.city,
    neighborhood: input.neighborhood ?? null,
    fuelType: input.fuelType,
    price: input.price,
    nickname: input.nickname,
    status: input.status,
    hasPhoto: input.hasPhoto,
    photoName: input.photoName ?? null,
    photoType: input.photoType ?? null,
    photoSize: input.photoSize ?? null,
    lastErrorCode: input.lastErrorCode ?? null,
    lastErrorLabel: input.lastErrorLabel ?? null,
    attempts: input.attempts ?? existing?.attempts ?? 0,
    returnToHref: input.returnToHref ?? null,
    createdAt: existing?.createdAt ?? input.createdAt ?? timestamp,
    updatedAt: timestamp
  };

  const next = existing ? current.map((entry) => (entry.draftKey === input.draftKey ? nextEntry : entry)) : [nextEntry, ...current];
  return writeQueue(next);
}

export async function removeSubmissionQueueEntry(id: string) {
  const current = await readQueue();
  return writeQueue(current.filter((entry) => entry.id !== id));
}

export async function clearSubmissionQueueForDraftKey(draftKey: string) {
  const current = await readQueue();
  return writeQueue(current.filter((entry) => entry.draftKey !== draftKey));
}

export function buildSubmissionQueueHref(entry: SubmissionQueueEntry) {
  const fuelParam = `fuel=${entry.fuelType}`;
  const returnParam = entry.returnToHref ? `&returnTo=${encodeURIComponent(entry.returnToHref)}` : "";
  return (`/enviar?stationId=${entry.stationId}&${fuelParam}${returnParam}#photo` as Route);
}

export function getSubmissionQueueStatusLabel(status: SubmissionQueueStatus) {
  if (status === "needs_photo") return "Foto precisa ser refeita";
  if (status === "retryable") return "Pronto para reenviar";
  return "Guardado neste aparelho";
}
