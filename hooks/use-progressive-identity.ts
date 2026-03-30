"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { getProgressiveIdentityAction } from "@/app/actions/user";
import { useMySubmissions } from "@/hooks/use-my-submissions";
import { useStreetSession } from "@/hooks/use-street-session";
import { loadSubmissionQueue } from "@/lib/queue/submission-queue";
import type { CollectorTrust, UtilityStatus } from "@/lib/ops/collector-trust";
import {
  deriveProgressiveIdentityPhase,
  deriveProgressiveIdentitySignals,
  deriveProgressiveIdentityTriggers,
  normalizeProgressiveNickname,
  persistProgressiveIdentityNickname,
  readProgressiveIdentityProfile,
  type ProgressiveIdentityLocalProfile,
  type ProgressiveIdentityLocalSignals,
  type ProgressiveIdentityPhase,
  type ProgressiveIdentitySignal,
  type ProgressiveIdentityTrigger,
  type ProgressiveIdentityRemoteSnapshot
} from "@/lib/identity/progressive";

export interface ProgressiveIdentityState {
  isLoaded: boolean;
  phase: ProgressiveIdentityPhase;
  phaseLabel: string;
  phaseDescription: string;
  nickname: string | null;
  historyCount: number;
  localProfile: ProgressiveIdentityLocalProfile | null;
  localSignals: ProgressiveIdentityLocalSignals;
  localSignalsList: ProgressiveIdentitySignal[];
  trust: CollectorTrust | null;
  utilityStatus: UtilityStatus;
  remoteSnapshot: ProgressiveIdentityRemoteSnapshot | null;
  eligibleTriggers: ProgressiveIdentityTrigger[];
}

function getPhaseCopy(phase: ProgressiveIdentityPhase) {
  switch (phase) {
    case "guest-collaborator":
      return {
        label: "Colaborador guest",
        description: "O aparelho já guarda continuidade local, sem login tradicional."
      };
    case "recognized-collaborator":
      return {
        label: "Colaborador reconhecido",
        description: "Seu trust remoto já existe e o Hub pode reaproveitar isso."
      };
    case "tester-beta":
      return {
        label: "Tester beta",
        description: "Você está em uma coorte de teste separada da identidade comum."
      };
    case "admin-ops":
      return {
        label: "Admin/ops",
        description: "Superfície administrativa isolada e protegida."
      };
    case "visitor-open":
    default:
      return {
        label: "Visitante aberto",
        description: "Exploração pública sem bloqueio inicial."
      };
  }
}

function getFallbackUtilityStatus(phase: ProgressiveIdentityPhase, nextStep: string | null): UtilityStatus {
  if (phase === "guest-collaborator") {
    return {
      role: "ativo",
      label: "Colaborador guest",
      description: "Seu navegador já preserva memória suficiente para continuar sem conta.",
      nextStep: nextStep ?? "Salve um apelido local para manter a continuidade.",
      color: "green"
    };
  }

  return {
    role: "iniciante",
    label: phase === "tester-beta" ? "Tester beta" : phase === "admin-ops" ? "Admin/ops" : "Visitante aberto",
    description: phase === "tester-beta"
      ? "Coorte de teste separada da identidade comum."
      : phase === "admin-ops"
        ? "Superfície administrativa isolada."
        : "Comece pelo mapa ou pelo primeiro envio, sem exigir login.",
    nextStep: nextStep ?? (phase === "visitor-open" ? "Fazer primeiro envio" : "Continuar a sessão local"),
    color: phase === "tester-beta" ? "indigo" : "blue"
  };
}

export function useProgressiveIdentity() {
  const pathname = usePathname();
  const { submissions, reporterNickname, isLoaded: submissionsLoaded } = useMySubmissions();
  const { session, sessionMode, lastGesture, nextStep, historyCount, lastSummary, isActive, isLoaded: sessionLoaded } = useStreetSession();
  const [localProfile, setLocalProfile] = useState<ProgressiveIdentityLocalProfile | null>(null);
  const [remoteSnapshot, setRemoteSnapshot] = useState<ProgressiveIdentityRemoteSnapshot | null>(null);
  const [remoteLoaded, setRemoteLoaded] = useState(false);
  const [hasPendingQueue, setHasPendingQueue] = useState(false);
  const [queueLoaded, setQueueLoaded] = useState(false);

  useEffect(() => {
    setLocalProfile(readProgressiveIdentityProfile());
  }, []);

  useEffect(() => {
    let cancelled = false;

    void loadSubmissionQueue()
      .then((queue) => {
        if (cancelled) return;
        setHasPendingQueue(queue.some((item) => item.status !== "success" && item.status !== "expired"));
        setQueueLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setHasPendingQueue(false);
        setQueueLoaded(true);
      });

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== "bomba-aberta:submission-queue") {
        return;
      }

      const raw = event.newValue;
      if (!raw) {
        setHasPendingQueue(false);
        return;
      }

      try {
        const queue = JSON.parse(raw) as Array<{ status?: string }>;
        setHasPendingQueue(queue.some((item) => item.status !== "success" && item.status !== "expired"));
      } catch {
        setHasPendingQueue(false);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!submissionsLoaded) return;

    const currentProfile = readProgressiveIdentityProfile();
    const normalizedReporterNickname = normalizeProgressiveNickname(reporterNickname ?? submissions[0]?.reporterNickname ?? null);

    if (normalizedReporterNickname && currentProfile?.nickname !== normalizedReporterNickname) {
      const nextProfile = persistProgressiveIdentityNickname(normalizedReporterNickname, currentProfile?.nickname ? currentProfile.nicknameSource : "submission");
      setLocalProfile(nextProfile);
      return;
    }

    setLocalProfile(currentProfile);
  }, [reporterNickname, submissions, submissionsLoaded]);

  const nickname = useMemo(() => {
    return normalizeProgressiveNickname(localProfile?.nickname ?? reporterNickname ?? submissions[0]?.reporterNickname ?? null);
  }, [localProfile?.nickname, reporterNickname, submissions]);

  const localSignals = useMemo<ProgressiveIdentityLocalSignals>(() => ({
    hasLocalHistory: submissions.length > 0 || historyCount > 0 || Boolean(lastSummary),
    hasDraftMemory: submissions.some((item) => item.status === "stored") || sessionMode !== "zero-state",
    hasPendingQueue: hasPendingQueue || submissions.some((item) => item.status === "stored"),
    sessionMode,
    lastGestureType: lastGesture?.type ?? null,
    nextStep: nextStep?.label ?? null,
    sessionId: session?.id ?? null
  }), [hasPendingQueue, historyCount, lastGesture?.type, nextStep, session?.id, sessionMode, submissions, lastSummary]);

  useEffect(() => {
    if (!submissionsLoaded || !sessionLoaded || !queueLoaded) return;

    let cancelled = false;
    const resolvedNickname = nickname ?? null;

    void getProgressiveIdentityAction(resolvedNickname, {
      hasMission: false,
      hasPending: localSignals.hasPendingQueue
    }).then((snapshot) => {
      if (cancelled) return;
      setRemoteSnapshot(snapshot);
      setRemoteLoaded(true);
    }).catch(() => {
      if (cancelled) return;
      setRemoteSnapshot({ trust: null, status: null });
      setRemoteLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [localSignals.hasPendingQueue, nickname, queueLoaded, sessionLoaded, submissionsLoaded]);

  const trust = remoteSnapshot?.trust ?? null;
  const phase = useMemo(() => deriveProgressiveIdentityPhase({
    pathname,
    nickname,
    trust,
    sessionMode: localSignals.sessionMode,
    hasLocalHistory: localSignals.hasLocalHistory,
    hasDraftMemory: localSignals.hasDraftMemory,
    hasPendingQueue: localSignals.hasPendingQueue
  }), [localSignals.hasDraftMemory, localSignals.hasLocalHistory, localSignals.hasPendingQueue, localSignals.sessionMode, nickname, pathname, trust]);

  const phaseCopy = getPhaseCopy(phase);
  const utilityStatus = useMemo(() => {
    if (trust) {
      return remoteSnapshot?.status ?? getFallbackUtilityStatus(phase, localSignals.nextStep);
    }

    return getFallbackUtilityStatus(phase, localSignals.nextStep);
  }, [localSignals.nextStep, phase, remoteSnapshot?.status, trust]);

  const localSignalsList = useMemo(() => deriveProgressiveIdentitySignals({
    hasLocalHistory: localSignals.hasLocalHistory,
    hasDraftMemory: localSignals.hasDraftMemory,
    hasPendingQueue: localSignals.hasPendingQueue,
    sessionMode: localSignals.sessionMode,
    lastGestureType: localSignals.lastGestureType,
    nextStep: localSignals.nextStep,
    trust
  }), [localSignals, trust]);

  const eligibleTriggers = useMemo(() => deriveProgressiveIdentityTriggers({
    phase,
    nickname,
    hasLocalHistory: localSignals.hasLocalHistory,
    hasDraftMemory: localSignals.hasDraftMemory,
    hasPendingQueue: localSignals.hasPendingQueue,
    sessionMode: localSignals.sessionMode,
    lastGestureType: localSignals.lastGestureType,
    nextStep: localSignals.nextStep,
    trust
  }), [localSignals, nickname, phase, trust]);

  return {
    isLoaded: submissionsLoaded && sessionLoaded && queueLoaded && remoteLoaded,
    phase,
    phaseLabel: phaseCopy.label,
    phaseDescription: phaseCopy.description,
    nickname,
    historyCount,
    localProfile,
    localSignals,
    localSignalsList,
    trust,
    utilityStatus,
    remoteSnapshot,
    eligibleTriggers,
    isTester: Boolean(trust?.isTester),
    isActive: isActive || localSignals.sessionMode === "active-state"
  } satisfies ProgressiveIdentityState & { isTester: boolean; isActive: boolean };
}
