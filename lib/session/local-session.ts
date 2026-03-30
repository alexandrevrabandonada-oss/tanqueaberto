export type LocalSessionGestureType = "view" | "touch" | "start" | "complete";
export type LocalSessionMode = "zero-state" | "returning-state" | "active-state";
export type LocalSessionEndReason = "manual" | "timeout" | "reset";

export interface LocalSessionGesture {
  type: LocalSessionGestureType;
  at: string;
  stationId?: string | null;
}

export interface LocalSessionSnapshot {
  id: string;
  deviceId: string;
  startTime: string;
  lastActivity: string;
  stationsSeen: string[];
  stationsTouched: string[];
  enviosIniciados: number;
  enviosConcluidos: number;
  lastGesture: LocalSessionGesture | null;
}

export interface LocalSessionSummary {
  id: string;
  deviceId: string;
  date: string;
  stationsSeenCount: number;
  stationsTouchedCount: number;
  gapsFilledCount: number;
  durationMs: number;
  completedAt: string;
  endReason: LocalSessionEndReason;
  lastGesture: LocalSessionGesture | null;
}

export interface LocalSessionNextStep {
  label: string;
  href: string;
  description: string;
}

const DEVICE_STORAGE_KEY = "bomba-aberta:device-id";
const SESSION_STORAGE_KEY = "bomba-aberta:street-session";
const HISTORY_STORAGE_KEY = "bomba-aberta:street-session-history";
const SUMMARY_STORAGE_KEY = "bomba-aberta:last-session-summary";
export const LOCAL_SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const HISTORY_LIMIT = 12;

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

function readStorage<T>(key: string, fallback: T): T {
  if (!supportsStorage()) {
    return fallback;
  }

  const parsed = safeParse<T>(window.localStorage.getItem(key));
  return parsed ?? fallback;
}

function writeStorage<T>(key: string, value: T | null) {
  if (!supportsStorage()) {
    return;
  }

  if (value === null) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function createUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function isLocalSessionExpired(snapshot: LocalSessionSnapshot, now = Date.now()) {
  const lastActivity = new Date(snapshot.lastActivity).getTime();
  return !Number.isFinite(lastActivity) || now - lastActivity > LOCAL_SESSION_TIMEOUT_MS;
}

function createSession(deviceId: string, now = new Date().toISOString()): LocalSessionSnapshot {
  return {
    id: createUuid(),
    deviceId,
    startTime: now,
    lastActivity: now,
    stationsSeen: [],
    stationsTouched: [],
    enviosIniciados: 0,
    enviosConcluidos: 0,
    lastGesture: null
  };
}

function normalizeSnapshot(snapshot: LocalSessionSnapshot | null, deviceId: string): LocalSessionSnapshot | null {
  if (!snapshot) {
    return null;
  }

  return {
    ...snapshot,
    deviceId: snapshot.deviceId || deviceId,
    stationsSeen: Array.isArray(snapshot.stationsSeen) ? snapshot.stationsSeen.filter(Boolean) : [],
    stationsTouched: Array.isArray(snapshot.stationsTouched) ? snapshot.stationsTouched.filter(Boolean) : [],
    enviosIniciados: Number.isFinite(snapshot.enviosIniciados) ? snapshot.enviosIniciados : 0,
    enviosConcluidos: Number.isFinite(snapshot.enviosConcluidos) ? snapshot.enviosConcluidos : 0,
    lastGesture: snapshot.lastGesture ?? null
  };
}

function normalizeHistoryEntry(entry: LocalSessionSummary | null, deviceId: string): LocalSessionSummary | null {
  if (!entry) {
    return null;
  }

  return {
    ...entry,
    deviceId: entry.deviceId || deviceId,
    stationsSeenCount: Number.isFinite(entry.stationsSeenCount) ? entry.stationsSeenCount : 0,
    stationsTouchedCount: Number.isFinite(entry.stationsTouchedCount) ? entry.stationsTouchedCount : 0,
    gapsFilledCount: Number.isFinite(entry.gapsFilledCount) ? entry.gapsFilledCount : 0,
    durationMs: Number.isFinite(entry.durationMs) ? entry.durationMs : 0,
    lastGesture: entry.lastGesture ?? null,
    endReason: (entry.endReason || "reset") as LocalSessionEndReason
  };
}

export function getOrCreateLocalDeviceId() {
  if (!supportsStorage()) {
    return "serverless";
  }

  const saved = window.localStorage.getItem(DEVICE_STORAGE_KEY);
  if (saved) {
    return saved;
  }

  const deviceId = createUuid();
  window.localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
  return deviceId;
}

export function readCurrentLocalSession() {
  if (!supportsStorage()) {
    return null;
  }

  const deviceId = getOrCreateLocalDeviceId();
  return normalizeSnapshot(safeParse<LocalSessionSnapshot>(window.localStorage.getItem(SESSION_STORAGE_KEY)), deviceId);
}

export function readLocalSessionHistory() {
  if (!supportsStorage()) {
    return [];
  }

  const deviceId = getOrCreateLocalDeviceId();
  return readStorage<Array<LocalSessionSummary | null>>(HISTORY_STORAGE_KEY, [])
    .map((entry) => normalizeHistoryEntry(entry, deviceId))
    .filter((entry): entry is LocalSessionSummary => Boolean(entry))
    .sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime());
}

export function readLastLocalSessionSummary() {
  if (!supportsStorage()) {
    return null;
  }

  const deviceId = getOrCreateLocalDeviceId();
  return normalizeHistoryEntry(safeParse<LocalSessionSummary>(window.localStorage.getItem(SUMMARY_STORAGE_KEY)), deviceId);
}

export function persistCurrentLocalSession(snapshot: LocalSessionSnapshot | null) {
  writeStorage(SESSION_STORAGE_KEY, snapshot);
}

export function persistLocalSessionHistory(history: LocalSessionSummary[]) {
  writeStorage(
    HISTORY_STORAGE_KEY,
    history
      .slice(0, HISTORY_LIMIT)
      .map((entry) => normalizeHistoryEntry(entry, entry.deviceId) ?? entry)
  );
}

export function persistLastLocalSessionSummary(summary: LocalSessionSummary | null) {
  writeStorage(SUMMARY_STORAGE_KEY, summary);
}

export function clearCurrentLocalSession() {
  if (!supportsStorage()) {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function summarizeLocalSession(snapshot: LocalSessionSnapshot, endReason: LocalSessionEndReason): LocalSessionSummary {
  const completedAt = new Date().toISOString();
  return {
    id: snapshot.id,
    deviceId: snapshot.deviceId,
    date: new Date(snapshot.startTime).toLocaleDateString(),
    stationsSeenCount: snapshot.stationsSeen.length,
    stationsTouchedCount: snapshot.stationsTouched.length,
    gapsFilledCount: snapshot.enviosConcluidos,
    durationMs: new Date(snapshot.lastActivity).getTime() - new Date(snapshot.startTime).getTime(),
    completedAt,
    endReason,
    lastGesture: snapshot.lastGesture
  };
}

export function appendLocalSessionHistory(history: LocalSessionSummary[], summary: LocalSessionSummary) {
  return [summary, ...history.filter((entry) => entry.id !== summary.id)].slice(0, HISTORY_LIMIT);
}

export function applyLocalSessionActivity(
  snapshot: LocalSessionSnapshot,
  type: LocalSessionGestureType,
  stationId?: string,
  now = new Date().toISOString()
) {
  const next: LocalSessionSnapshot = {
    ...snapshot,
    lastActivity: now,
    lastGesture: {
      type,
      stationId: stationId ?? null,
      at: now
    }
  };

  if (type === "view" && stationId && !next.stationsSeen.includes(stationId)) {
    next.stationsSeen = [...next.stationsSeen, stationId];
  } else if (type === "touch" && stationId && !next.stationsTouched.includes(stationId)) {
    next.stationsTouched = [...next.stationsTouched, stationId];
  } else if (type === "start") {
    next.enviosIniciados += 1;
  } else if (type === "complete") {
    next.enviosConcluidos += 1;
  }

  return next;
}

export function openOrResumeLocalSession(deviceId: string, current: LocalSessionSnapshot | null, now = new Date().toISOString()) {
  if (!current || isLocalSessionExpired(current, Date.now())) {
    return createSession(deviceId, now);
  }

  return normalizeSnapshot(current, deviceId);
}

export function getLocalSessionMode(snapshot: LocalSessionSnapshot | null, history: LocalSessionSummary[]) {
  if (snapshot) {
    return "active-state" as const;
  }

  return history.length > 0 ? ("returning-state" as const) : ("zero-state" as const);
}

export function deriveLocalSessionNextStep(snapshot: LocalSessionSnapshot | null) {
  if (!snapshot) {
    return {
      label: "Abrir mapa",
      href: "/" as const,
      description: "Comece pelo mapa para criar a primeira continuidade local."
    };
  }

  const stationId = snapshot.lastGesture?.stationId ?? null;

  if (snapshot.enviosIniciados > snapshot.enviosConcluidos) {
    return {
      label: "Concluir envio",
      href: stationId ? (`/enviar?stationId=${stationId}#photo` as const) : ("/enviar" as const),
      description: "Existe um envio aberto no aparelho. Volte para concluir sem perder contexto."
    };
  }

  if (snapshot.lastGesture?.type === "complete" && stationId) {
    return {
      label: "Ver posto",
      href: (`/postos/${stationId}` as const),
      description: "O último gesto já virou dado. Abra o posto para continuar a leitura."
    };
  }

  if (stationId) {
    return {
      label: snapshot.lastGesture?.type === "view" ? "Fazer envio" : "Retomar posto",
      href: (`/enviar?stationId=${stationId}#photo` as const),
      description: "O último gesto ficou salvo. Continue pelo mesmo posto sem reiniciar a rota."
    };
  }

  return {
    label: "Explorar mapa",
    href: "/" as const,
    description: "Sem posto marcado ainda. O mapa é a melhor entrada para continuar."
  };
}

export function settleExpiredLocalSession(
  current: LocalSessionSnapshot | null,
  history: LocalSessionSummary[],
  reason: LocalSessionEndReason
) {
  if (!current) {
    return { current: null, history, summary: null as LocalSessionSummary | null };
  }

  const summary = summarizeLocalSession(current, reason);
  const nextHistory = appendLocalSessionHistory(history, summary);
  return { current: null, history: nextHistory, summary };
}

export function createInitialLocalSessionState() {
  const deviceId = getOrCreateLocalDeviceId();
  const current = readCurrentLocalSession();
  const history = readLocalSessionHistory();
  const lastSummary = readLastLocalSessionSummary();
  return { deviceId, current, history, lastSummary };
}


