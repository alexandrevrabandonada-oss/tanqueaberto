"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Fingerprint, Sparkles } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { trackProductEvent } from "@/lib/telemetry/client";
import { cn } from "@/lib/utils";
import { persistProgressiveIdentityNickname, normalizeProgressiveNickname } from "@/lib/identity/progressive";
import { useProgressiveIdentity } from "@/hooks/use-progressive-identity";

export type IdentityPromptContext = "home" | "hub" | "submit";

interface ProgressiveIdentityPromptProps {
  context: IdentityPromptContext;
  source?: "return" | "success" | "queue" | "trust" | "draft";
  className?: string;
}

const DISMISS_KEY = "bomba-aberta:identity-prompt-dismissed-at";
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function supportsStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readDismissedAt() {
  if (!supportsStorage()) return null;
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return null;
  const timestamp = new Date(raw).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function writeDismissedAt() {
  if (!supportsStorage()) return;
  window.localStorage.setItem(DISMISS_KEY, new Date().toISOString());
}

function getContextCopy(context: IdentityPromptContext, source?: ProgressiveIdentityPromptProps["source"]) {
  if (context === "submit") {
    return {
      title: "Quer salvar seu apelido neste aparelho?",
      description: "Você concluiu um envio. Salvar um apelido leve ajuda a continuar de onde parou sem criar conta.",
      hint: "Continua o histórico neste aparelho e reaproveita a sessão local.",
      inputLabel: "Apelido local"
    };
  }

  if (context === "hub") {
    return {
      title: "Quer dar nome a esta continuidade?",
      description: source === "queue"
        ? "Existe fila local no aparelho. Um apelido ajuda a recuperar histórico e seguir sem perder contexto."
        : source === "trust"
          ? "Seu trust já tem lastro. Salvar um apelido deixa o impacto mais fácil de retomar neste aparelho."
          : "O Hub já reconhece sua continuidade local. Um apelido ajuda a ver seu impacto e voltar depois.",
      hint: "Sem email, senha ou cadastro tradicional.",
      inputLabel: "Apelido local"
    };
  }

  return {
    title: "Salve um apelido para este aparelho",
    description: source === "return"
      ? "Você já voltou antes. Guardar um apelido leve ajuda a recuperar histórico e continuar sem atrito."
      : source === "draft"
        ? "Há um rascunho salvo. Um apelido mantém esse contexto vivo quando você voltar."
        : "Quando fizer sentido, seu aparelho pode lembrar o apelido e a continuidade operacional.",
    hint: "Depois disso, o app consegue continuar de onde parou com menos atrito.",
    inputLabel: "Apelido local"
  };
}

export function ProgressiveIdentityPrompt({ context, source, className }: ProgressiveIdentityPromptProps) {
  const identity = useProgressiveIdentity();
  const [nickname, setNickname] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const trigger = identity.eligibleTriggers[0] ?? null;
  const copy = useMemo(() => getContextCopy(context, source), [context, source]);
  const shouldOffer = useMemo(() => {
    if (!identity.isLoaded) return false;
    if (identity.nickname) return false;
    if (isDismissed) return false;
    if (!trigger) return false;

    const returnSignal = identity.localSignals.sessionMode === "returning-state" || identity.localSignals.sessionMode === "active-state";
    const returnDepthSignal = identity.historyCount >= 2;
    const queueSignal = identity.localSignals.hasPendingQueue || source === "queue";
    const draftSignal = source === "draft";
    const trustSignal = Boolean(identity.trust && !identity.trust.isTester && identity.trust.score >= 50);
    const submissionSignal = context === "submit" && source === "success";
    const homeSignal = context === "home" && (returnDepthSignal || trustSignal);
    const hubSignal = context === "hub" && (returnSignal || returnDepthSignal || trustSignal);
    const submitSignal = context === "submit" && (submissionSignal || (returnDepthSignal && (queueSignal || draftSignal)) || trustSignal);

    return submitSignal || homeSignal || hubSignal || trustSignal;
  }, [context, identity.historyCount, identity.isLoaded, identity.localSignals.hasPendingQueue, identity.localSignals.sessionMode, identity.nickname, identity.trust, isDismissed, source, trigger]);

  useEffect(() => {
    if (!shouldOffer) return;

    const dismissedAt = readDismissedAt();
    if (dismissedAt && Date.now() - dismissedAt < COOLDOWN_MS) {
      setIsDismissed(true);
      return;
    }

    setIsVisible(true);
    void trackProductEvent({
      eventType: "identity_prompt_shown",
      pagePath: window.location.pathname,
      scopeType: "identity",
      scopeId: `${context}:${trigger?.id ?? "none"}`,
      payload: {
        context,
        source: source ?? null,
        trigger: trigger?.id ?? null,
        phase: identity.phase,
        sessionMode: identity.localSignals.sessionMode,
        hasDraftMemory: identity.localSignals.hasDraftMemory,
        hasPendingQueue: identity.localSignals.hasPendingQueue,
        hasTrust: Boolean(identity.trust),
        trustScore: identity.trust?.score ?? null
      }
    });
  }, [context, identity.localSignals.hasDraftMemory, identity.localSignals.hasPendingQueue, identity.localSignals.sessionMode, identity.phase, identity.trust, shouldOffer, source, trigger?.id]);

  useEffect(() => {
    if (!identity.nickname || nickname) return;
    setNickname(identity.nickname);
  }, [identity.nickname, nickname]);

  if (!isVisible || !shouldOffer) return null;

  const handleSave = async () => {
    const normalized = normalizeProgressiveNickname(nickname);
    if (!normalized) return;

    setIsSaving(true);
    persistProgressiveIdentityNickname(normalized, "manual");
    void trackProductEvent({
      eventType: "identity_prompt_saved",
      pagePath: window.location.pathname,
      scopeType: "identity",
      scopeId: `${context}:${trigger?.id ?? "none"}`,
      payload: {
        context,
        source: source ?? null,
        trigger: trigger?.id ?? null,
        nickname: normalized,
        phase: identity.phase,
        sessionMode: identity.localSignals.sessionMode
      }
    });
    setIsSaving(false);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    writeDismissedAt();
    void trackProductEvent({
      eventType: "identity_prompt_dismissed",
      pagePath: window.location.pathname,
      scopeType: "identity",
      scopeId: `${context}:${trigger?.id ?? "none"}`,
      payload: {
        context,
        source: source ?? null,
        trigger: trigger?.id ?? null,
        phase: identity.phase,
        sessionMode: identity.localSignals.sessionMode
      }
    });
    setIsDismissed(true);
    setIsVisible(false);
  };

  return (
    <SectionCard className={cn("space-y-4 border-[color:var(--color-accent)]/18 bg-[linear-gradient(180deg,rgba(255,204,0,0.10),rgba(255,255,255,0.04))]", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-accent)]/18 bg-[color:var(--color-accent)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--color-accent)]">
            <Sparkles className="h-3.5 w-3.5" />
            Identidade leve
          </div>
          <h3 className="text-lg font-semibold text-white">{copy.title}</h3>
          <p className="max-w-2xl text-sm text-white/62">{copy.description}</p>
        </div>
        <div className="hidden rounded-2xl border border-white/8 bg-black/25 p-3 text-white/70 sm:block">
          <Fingerprint className="h-5 w-5 text-[color:var(--color-accent)]" />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-[18px] border border-white/8 bg-black/25 p-3 text-sm text-white/58">Continuar de onde parou</div>
        <div className="rounded-[18px] border border-white/8 bg-black/25 p-3 text-sm text-white/58">Ver seu impacto</div>
        <div className="rounded-[18px] border border-white/8 bg-black/25 p-3 text-sm text-white/58">Recuperar histórico neste aparelho</div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-white/36" htmlFor={`identity-nickname-${context}`}>
          {copy.inputLabel}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={`identity-nickname-${context}`}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="Ex: Dani, Lia, Nino"
            className="h-12 w-full rounded-[18px] border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-white/24 focus:border-[color:var(--color-accent)]/40"
          />
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !normalizeProgressiveNickname(nickname)}
            className="h-12 shrink-0 px-4 text-xs font-black uppercase tracking-[0.18em]"
          >
            Salvar apelido
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-white/42">{copy.hint}</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={handleDismiss} className="text-xs font-semibold uppercase tracking-[0.18em] text-white/38 transition hover:text-white/62">
          Agora não
        </button>
        <ButtonLink href={context === "hub" ? "/hub" : "/enviar"} variant="secondary" className="h-10 px-3 text-xs font-black uppercase tracking-[0.18em]">
          {context === "hub" ? "Ver hub" : "Ir para envio"}
        </ButtonLink>
      </div>
    </SectionCard>
  );
}


