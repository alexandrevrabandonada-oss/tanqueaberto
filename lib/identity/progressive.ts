import type { CollectorTrust, UtilityStatus } from "@/lib/ops/collector-trust";

export type ProgressiveIdentityPhase =
  | "visitor-open"
  | "guest-collaborator"
  | "recognized-collaborator"
  | "tester-beta"
  | "admin-ops";

export type ProgressiveIdentitySignal = "first_gesture" | "local_history" | "draft_saved" | "pending_queue" | "remote_trust" | "tester_access";

export interface ProgressiveIdentityLocalProfile {
  nickname: string | null;
  nicknameSource: "manual" | "submission" | "draft" | "unknown";
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  updatedAt: string | null;
}

export interface ProgressiveIdentityLocalSignals {
  hasLocalHistory: boolean;
  hasDraftMemory: boolean;
  hasPendingQueue: boolean;
  sessionMode: "zero-state" | "returning-state" | "active-state";
  lastGestureType: "view" | "touch" | "start" | "complete" | null;
  nextStep: string | null;
  sessionId: string | null;
}

export interface ProgressiveIdentityTrigger {
  id: string;
  label: string;
  description: string;
  href?: string;
  priority: number;
}

export interface ProgressiveIdentityRemoteSnapshot {
  trust: CollectorTrust | null;
  status: UtilityStatus | null;
}

const STORAGE_KEY = "bomba-aberta:progressive-identity";

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

export function normalizeProgressiveNickname(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ") ?? "";
  if (!normalized) return null;
  return normalized.slice(0, 32);
}

export function readProgressiveIdentityProfile(): ProgressiveIdentityLocalProfile | null {
  if (!supportsStorage()) return null;
  return safeParse<ProgressiveIdentityLocalProfile>(window.localStorage.getItem(STORAGE_KEY));
}

function writeProgressiveIdentityProfile(profile: ProgressiveIdentityLocalProfile) {
  if (!supportsStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function persistProgressiveIdentityNickname(
  nickname: string | null,
  source: ProgressiveIdentityLocalProfile["nicknameSource"] = "manual"
) {
  if (!supportsStorage()) return null;

  const normalized = normalizeProgressiveNickname(nickname);
  const now = new Date().toISOString();
  const current = readProgressiveIdentityProfile();
  const next: ProgressiveIdentityLocalProfile = {
    nickname: normalized,
    nicknameSource: source,
    firstSeenAt: current?.firstSeenAt ?? now,
    lastSeenAt: now,
    updatedAt: now
  };

  writeProgressiveIdentityProfile(next);
  return next;
}

export function touchProgressiveIdentityProfile() {
  if (!supportsStorage()) return null;

  const current = readProgressiveIdentityProfile();
  if (!current) return null;

  const now = new Date().toISOString();
  const next: ProgressiveIdentityLocalProfile = {
    ...current,
    lastSeenAt: now,
    updatedAt: now
  };

  writeProgressiveIdentityProfile(next);
  return next;
}

export function deriveProgressiveIdentityPhase(input: {
  pathname?: string | null;
  nickname?: string | null;
  trust?: CollectorTrust | null;
  sessionMode?: ProgressiveIdentityLocalSignals["sessionMode"];
  hasLocalHistory?: boolean;
  hasDraftMemory?: boolean;
  hasPendingQueue?: boolean;
}): ProgressiveIdentityPhase {
  const pathname = input.pathname ?? "";
  if (pathname.startsWith("/admin")) {
    return "admin-ops";
  }

  if (input.trust?.isTester) {
    return "tester-beta";
  }

  if (input.trust) {
    return "recognized-collaborator";
  }

  if (input.nickname || input.hasLocalHistory || input.hasDraftMemory || input.hasPendingQueue || input.sessionMode === "active-state" || input.sessionMode === "returning-state") {
    return "guest-collaborator";
  }

  return "visitor-open";
}

export function deriveProgressiveIdentitySignals(input: {
  hasLocalHistory: boolean;
  hasDraftMemory: boolean;
  hasPendingQueue: boolean;
  sessionMode: ProgressiveIdentityLocalSignals["sessionMode"];
  lastGestureType: ProgressiveIdentityLocalSignals["lastGestureType"];
  nextStep: string | null;
  trust: CollectorTrust | null;
}): ProgressiveIdentitySignal[] {
  const signals: ProgressiveIdentitySignal[] = [];

  if (input.lastGestureType) {
    signals.push("first_gesture");
  }
  if (input.hasLocalHistory) {
    signals.push("local_history");
  }
  if (input.hasDraftMemory) {
    signals.push("draft_saved");
  }
  if (input.hasPendingQueue) {
    signals.push("pending_queue");
  }
  if (input.trust) {
    signals.push("remote_trust");
  }
  if (input.trust?.isTester) {
    signals.push("tester_access");
  }

  return signals;
}

export function deriveProgressiveIdentityTriggers(input: {
  phase: ProgressiveIdentityPhase;
  nickname: string | null;
  hasLocalHistory: boolean;
  hasDraftMemory: boolean;
  hasPendingQueue: boolean;
  sessionMode: ProgressiveIdentityLocalSignals["sessionMode"];
  lastGestureType: ProgressiveIdentityLocalSignals["lastGestureType"];
  nextStep: string | null;
  trust: CollectorTrust | null;
}): ProgressiveIdentityTrigger[] {
  const triggers: ProgressiveIdentityTrigger[] = [];

  if (input.phase === "admin-ops") {
    return triggers;
  }

  if (!input.nickname && (input.hasDraftMemory || input.hasLocalHistory || input.hasPendingQueue || input.lastGestureType)) {
    triggers.push({
      id: "set_nickname",
      label: "Salvar apelido local",
      description: "Crie uma identidade leve para preservar continuidade no aparelho.",
      priority: 10
    });
  }

  if (input.phase === "visitor-open") {
    triggers.push({
      id: "first_submission",
      label: "Fazer primeiro envio",
      description: "Abra o fluxo sem criar conta tradicional.",
      href: "/enviar",
      priority: 9
    });
  }

  if (input.hasPendingQueue) {
    triggers.push({
      id: "resume_queue",
      label: "Retomar fila local",
      description: "Existe dado aguardando envio neste navegador.",
      href: "/historico",
      priority: 8
    });
  }

  if (input.sessionMode === "active-state" || input.sessionMode === "returning-state") {
    triggers.push({
      id: "resume_session",
      label: "Continuar sessão",
      description: input.nextStep ?? "O próximo gesto já está preparado.",
      href: "/hub",
      priority: 7
    });
  }

  if (input.trust?.isTester) {
    triggers.push({
      id: "tester_feedback",
      label: "Abrir feedback beta",
      description: "Você está em uma coorte de teste com retorno rápido.",
      href: "/feedback",
      priority: 6
    });
  }

  if (input.trust && !input.trust.isTester) {
    triggers.push({
      id: "review_trust",
      label: "Ver continuidade operacional",
      description: "Seu trust já existe e pode ser reaproveitado no Hub.",
      href: "/hub",
      priority: 5
    });
  }

  return triggers.sort((left, right) => right.priority - left.priority).slice(0, 3);
}

