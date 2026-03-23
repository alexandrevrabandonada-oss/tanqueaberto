import type { Route } from "next";
import type { FuelType } from "@/lib/types";
import { storeQueuePhoto, getQueuePhoto, deleteQueuePhoto } from "./photo-storage";

export type SubmissionQueueStatus = 
  | "stored"         // Guardado localmente, aguardando primeira tentativa
  | "ready"          // Conexão detectada, pronto para reenvio assistido
  | "photo_required" // Falha na foto (corrompida ou deletada)
  | "failed"         // Falha técnica persistente
  | "success"        // Enviado com sucesso (mantido brevemente para feedback)
  | "expired";       // Passou do TTL de 12h

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
  recoveredAt?: string | null;
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
  photo?: File | null;
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
  if (!value) return null;
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

  // Items are marked as expired instead of being immediately deleted if they pass TTL
  if (!isFresh(entry.updatedAt) && entry.status !== "expired") {
    entry.status = "expired";
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
  if (!supportsStorage()) return [];
  const parsed = safeParse<SubmissionQueueEntry[]>(window.localStorage.getItem(STORAGE_KEY)) ?? [];
  return sortQueue(parsed.map(normalizeEntry).filter((item): item is SubmissionQueueEntry => Boolean(item)));
}

async function writeQueue(entries: SubmissionQueueEntry[]) {
  if (!supportsStorage()) return [];
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
  
  // Store photo in IndexedDB if provided
  if (input.photo) {
    await storeQueuePhoto(input.draftKey, input.photo);
  }

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
    hasPhoto: Boolean(input.photo || existing?.hasPhoto),
    photoName: input.photoName ?? input.photo?.name ?? existing?.photoName ?? null,
    photoType: input.photoType ?? input.photo?.type ?? existing?.photoType ?? null,
    photoSize: input.photoSize ?? input.photo?.size ?? existing?.photoSize ?? null,
    lastErrorCode: input.lastErrorCode ?? null,
    lastErrorLabel: input.lastErrorLabel ?? null,
    attempts: input.attempts ?? existing?.attempts ?? 0,
    returnToHref: input.returnToHref ?? null,
    createdAt: existing?.createdAt ?? input.createdAt ?? timestamp,
    updatedAt: timestamp,
    recoveredAt: existing?.recoveredAt
  };

  const next = existing ? current.map((entry) => (entry.draftKey === input.draftKey ? nextEntry : entry)) : [nextEntry, ...current];
  return writeQueue(next);
}

export async function removeSubmissionQueueEntry(id: string) {
  const current = await readQueue();
  const entry = current.find(e => e.id === id);
  if (entry) {
    await deleteQueuePhoto(entry.draftKey);
  }
  return writeQueue(current.filter((entry) => entry.id !== id));
}

export async function clearSubmissionQueueForDraftKey(draftKey: string) {
  const current = await readQueue();
  await deleteQueuePhoto(draftKey);
  return writeQueue(current.filter((entry) => entry.draftKey !== draftKey));
}

export async function markEntryAsSuccess(draftKey: string) {
  const current = await readQueue();
  const entry = current.find(e => e.draftKey === draftKey);
  if (entry) {
    entry.status = "success";
    entry.updatedAt = new Date().toISOString();
    entry.recoveredAt = entry.updatedAt;
    await deleteQueuePhoto(draftKey);
  }
  return writeQueue(current);
}

export function buildSubmissionQueueHref(entry: SubmissionQueueEntry) {
  const fuelParam = `fuel=${entry.fuelType}`;
  const returnParam = entry.returnToHref ? `&returnTo=${encodeURIComponent(entry.returnToHref)}` : "";
  return (`/enviar?stationId=${entry.stationId}&${fuelParam}${returnParam}#photo` as Route);
}

export function getSubmissionQueueStatusLabel(status: SubmissionQueueStatus) {
  switch (status) {
    case "photo_required": return "Foto precisa ser refeita";
    case "ready": return "Pronto para reenviar";
    case "stored": return "Guardado no aparelho";
    case "failed": return "Falha ao reenviar";
    case "success": return "Enviado com sucesso";
    case "expired": return "Expirado (12h)";
    default: return "Pendente";
  }
}
