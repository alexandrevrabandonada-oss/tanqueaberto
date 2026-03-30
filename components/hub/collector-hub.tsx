"use client";

import { useEffect, useState } from "react";
import { useSubmissionHistory } from "@/components/history/submission-history-context";
import { useMissionContext } from "@/components/mission/mission-context";
import { SubmissionStatus } from "./submission-status";
import { useStreetMode } from "@/hooks/use-street-mode";
import { useStreetSession } from "@/hooks/use-street-session";
import { loadSubmissionQueue, type SubmissionQueueEntry, buildSubmissionQueueHref, getSubmissionQueueStatusLabel } from "@/lib/queue/submission-queue";
import { trackProductEvent } from "@/lib/telemetry/client";
import { ArrowRight, Clock3, Smartphone, Activity, MapPin } from "lucide-react";
import type { StationWithReports } from "@/lib/types";
import { getStationPublicName } from "@/lib/quality/stations";
import { HubRecents } from "./hub-recents";
import { ReputationBadge } from "./reputation-badge";
import { ProofOfLifeReinforcement } from "./proof-of-life-reforcement";
import { TerritorialImpactCard } from "./territorial-impact-card";
import { getCollectorTerritorialImpactAction } from "@/app/hub/actions";
import { useProgressiveIdentity } from "@/hooks/use-progressive-identity";
import { ProgressiveIdentityPrompt } from "@/components/identity/progressive-identity-prompt";
import type { CollectorTerritorialImpact } from "@/lib/ops/recorte-activity";
import { recordHubInteraction } from "@/lib/telemetry/attribution";
import { HubActivationHero } from "./hub-activation-hero";
import { useGeolocation } from "@/hooks/use-geolocation";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatRecencyLabel } from "@/lib/format/time";
import { fuelLabels } from "@/lib/format/labels";
import { SubmissionStatusLine } from "@/components/history/submission-status-line";
import { type MySubmission } from "@/hooks/use-my-submissions";

interface CollectorHubProps {
  stations: StationWithReports[];
}

function HubStat({ label, value, hint, icon: Icon, tone = "white" }: { label: string; value: string | number; hint: string; icon: React.ComponentType<{ className?: string }>; tone?: "white" | "amber" | "blue" | "emerald"; }) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-black/25 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">{label}</p>
          <p className={cn("mt-2 text-2xl font-semibold", tone === "amber" ? "text-amber-300" : tone === "blue" ? "text-blue-300" : tone === "emerald" ? "text-emerald-300" : "text-white")}>{value}</p>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl border", tone === "amber" ? "border-amber-500/20 bg-amber-500/10 text-amber-300" : tone === "blue" ? "border-blue-500/20 bg-blue-500/10 text-blue-300" : tone === "emerald" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/5 text-white/70") }>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-xs text-white/48">{hint}</p>
    </div>
  );
}

function getLatestSubmission(submissions: MySubmission[]) {
  return submissions[0] ?? null;
}

function getLastGestureSummary(
  latestSubmission: MySubmission | null,
  latestLocalEntry: SubmissionQueueEntry | null,
  missionName: string | null,
  lastGesture: { type: "view" | "touch" | "start" | "complete"; at: string; stationId?: string | null } | null,
  stations: StationWithReports[]
) {
  if (lastGesture?.stationId) {
    const station = stations.find((item) => item.id === lastGesture.stationId) ?? null;
    const stationName = station ? getStationPublicName(station) : lastGesture.stationId;
    const hintPrefix = lastGesture.type === "complete"
      ? "Ultimo gesto local concluido"
      : lastGesture.type === "start"
        ? "Envio iniciado localmente"
        : lastGesture.type === "touch"
          ? "Posto tocado localmente"
          : "Posto visto localmente";

    return {
      value: stationName,
      hint: `${hintPrefix} · ${formatRecencyLabel(lastGesture.at)}`,
      href: station
        ? lastGesture.type === "complete"
          ? (`/postos/${station.id}` as const)
          : (`/enviar?stationId=${station.id}#photo` as const)
        : ("/enviar" as const)
    };
  }

  if (latestSubmission) {
    return {
      value: latestSubmission.stationName,
      hint: `${formatRecencyLabel(latestSubmission.submittedAt)} · ${latestSubmission.status === "approved" ? "aprovado" : latestSubmission.status === "rejected" ? "rejeitado" : "em moderacao"}`,
      href: `/enviar?stationId=${latestSubmission.stationId}`
    };
  }

  if (latestLocalEntry) {
    return {
      value: latestLocalEntry.stationName,
      hint: `${formatRecencyLabel(latestLocalEntry.updatedAt)} · ${getSubmissionQueueStatusLabel(latestLocalEntry.status)}`,
      href: buildSubmissionQueueHref(latestLocalEntry)
    };
  }

  if (missionName) {
    return {
      value: missionName,
      hint: "Missão ativa pronta para continuar.",
      href: "/beta/missoes"
    };
  }

  return {
    value: "Sem gesto ainda",
    hint: "A primeira ação real ainda não foi registrada.",
    href: "/"
  };
}

export function CollectorHub({ stations }: CollectorHubProps) {
  const { submissions, reporterNickname, isLoaded: historyLoaded } = useSubmissionHistory();
  const { mission, stats: missionStats, isLoaded: missionLoaded } = useMissionContext();
  const { recentIds } = useStreetMode();
  const { session, sessionMode, lastGesture, nextStep } = useStreetSession();
  const identity = useProgressiveIdentity();
  const [localQueue, setLocalQueue] = useState<SubmissionQueueEntry[]>([]);
  const [localLoaded, setLocalLoaded] = useState(false);
  const trust = identity.trust;
  const [impact, setImpact] = useState<CollectorTerritorialImpact | null>(null);
  const { getLocation } = useGeolocation();
  const [isNarrowMobile, setIsNarrowMobile] = useState(false);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  useEffect(() => {
    const update = () => setIsNarrowMobile(window.innerWidth < 640);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const nickname = identity.nickname ?? reporterNickname;
      const [queue, impactData] = await Promise.all([
        loadSubmissionQueue(),
        nickname ? getCollectorTerritorialImpactAction(nickname) : Promise.resolve(null)
      ]);
      setLocalQueue(queue);
      setImpact(impactData);
      setLocalLoaded(true);
      recordHubInteraction();
    };
    loadData();
  }, [identity.nickname, reporterNickname]);
  useEffect(() => {
    if (!localLoaded) return;

    void trackProductEvent({
      eventType: "hub_opened",
      pagePath: "/hub",
      pageTitle: "Meu Hub",
      payload: {
        hasNickname: !!reporterNickname,
        submissionsCount: submissions.length,
        hasMission: !!mission,
        trustStage: trust?.trustStage,
        viewport: typeof window !== "undefined" ? (window.innerWidth >= 1024 ? "desktop" : window.innerWidth >= 768 ? "tablet" : "mobile") : "unknown"
      }
    });
  }, [reporterNickname, submissions.length, mission, trust?.trustStage, localLoaded]);

  if (!historyLoaded || !missionLoaded || !localLoaded || !identity.isLoaded) {
    return null;
  }

  const approvedCount = submissions.filter(s => s.status === "approved").length;
  const pendingCount = submissions.filter(s => s.status === "pending").length;
  const localItems = localQueue.filter(s => s.status !== "success");
  const localCount = localItems.length;
  const hasErrors = localItems.some(s => s.status === "failed" || s.status === "photo_required" || s.status === "expired");
  const isNewCollector = (trust?.missionsCompleted || 0) === 0 && approvedCount === 0;
  const isZeroState = sessionMode === "zero-state" && isNewCollector && !mission && localCount === 0 && pendingCount === 0 && submissions.length === 0;
  const defaultCity = stations.length > 0 ? stations[0].city : "Resende";
  const recentStations = recentIds
    .map(id => stations.find(station => station.id === id))
    .filter((station): station is StationWithReports => !!station)
    .slice(0, 3);

  const pendingNowCount = localCount + pendingCount;
  const lastSubmission = getLatestSubmission(submissions);
  const latestLocalEntry = localItems[0] ?? null;
  const lastGestureSummary = getLastGestureSummary(lastSubmission, latestLocalEntry, mission?.groupName ?? null, lastGesture, stations);

  const nextStepHref = hasErrors || localCount > 0 || pendingCount > 0
    ? "/enviar"
    : sessionMode !== "zero-state"
      ? nextStep.href
      : mission
        ? "/beta/missoes"
        : isZeroState
          ? "/"
          : "/enviar";

  const nextStepLabel = hasErrors
    ? "Corrigir fila"
    : localCount > 0
      ? "Enviar pendências"
      : pendingCount > 0
        ? "Acompanhar moderacao"
        : sessionMode !== "zero-state"
          ? nextStep.label
          : mission
            ? "Retomar missao"
            : isZeroState
              ? "Abrir mapa"
              : "Fazer envio real";

  const nextStepDescription = hasErrors
    ? "Ha pendências locais com erro que precisam de reenvio."
    : localCount > 0
      ? "Existe fila local no aparelho aguardando envio."
      : pendingCount > 0
        ? "Ha envios em moderacao; o status real ainda esta em andamento."
        : sessionMode !== "zero-state"
          ? nextStep.description
          : mission
            ? "A missao ativa esta pronta para continuar do ponto atual."
            : isZeroState
              ? "Comece pelo mapa para criar a primeira memoria operacional."
              : "Um novo envio melhora o mapa e reforca seu impacto.";

  const impactCount = impact?.stationsTouchedCount ?? approvedCount;
  const impactHint = impact?.remainingGaps
    ? `${impact.remainingGaps} lacunas ainda abertas.`
    : impactCount > 0
      ? `${impactCount} envios aprovados no mapa.`
      : "Ainda sem impacto aprovado.";
  const impactTone = hasErrors ? "amber" : mission ? "blue" : "emerald";
  const hasRichLastro = mission || pendingNowCount > 0 || approvedCount > 0 || impactCount > 0 || recentStations.length > 0 || (trust?.missionsCompleted || 0) > 0;
  const isSimpleHub = (sessionMode === "zero-state" || sessionMode === "returning-state") && !hasRichLastro;
  const showRichSections = !isSimpleHub;

  return (
    <div data-layout-scope="hub-wide" className="space-y-6">
      <ProgressiveIdentityPrompt context="hub" source={localCount > 0 ? "queue" : trust ? "trust" : "return"} />
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(390px,420px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(420px,460px)] xl:items-start">
        <div data-layout-role="main" className="space-y-4 min-w-0">
          {isZeroState ? (
            <HubActivationHero type="NEW_COLLECTOR" compact={isNarrowMobile} />
          ) : (
            <SectionCard className={cn("space-y-4 border-[color:var(--color-accent)]/20 bg-[linear-gradient(180deg,rgba(255,204,0,0.08),rgba(255,255,255,0.03))] xl:p-5", isNarrowMobile && "p-4") }>
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="warning" className="text-[10px] uppercase tracking-[0.22em]">{sessionMode === "active-state" ? "Sessão local" : sessionMode === "returning-state" ? "Retomada" : "Meu Hub"}</Badge>
                    <span className="text-[10px] uppercase tracking-[0.22em] text-white/36">{sessionMode === "active-state" ? "Ativa no aparelho" : sessionMode === "returning-state" ? "Continuação local" : "Continuidade"}</span>
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight text-white xl:text-[1.6rem]">{sessionMode === "zero-state" ? "Começar por aqui" : sessionMode === "active-state" ? "Continuar de onde parou" : "Próximo passo"}</h1>
                    <p className="max-w-2xl text-sm text-white/58 xl:text-[13px]">{sessionMode === "zero-state" ? "Um caminho só para começar sem repetir passos." : sessionMode === "active-state" ? "O último gesto, a fila local e o próximo passo voltam primeiro, sem login e sem reiniciar a página." : "O último gesto segue salvo e o Hub volta pela continuidade antes de qualquer ajuda extra."}</p>
                  </div>
                  <div className={cn("flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-white/38 xl:gap-1.5", isNarrowMobile && "hidden sm:flex", isSimpleHub && "hidden")}> 
                    {mission ? <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/62">Missão ativa</span> : null}
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/62">
                      {pendingNowCount > 0 ? `${pendingNowCount} pendências` : "Sem pendências"}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/62">
                      {lastSubmission ? "Último envio salvo" : latestLocalEntry ? "Última ação local" : sessionMode === "returning-state" ? "Memória local guardada" : session ? "Sessão local ativa" : "Sem memória ainda"}
                    </span>
                  </div>
                </div>

                <div className={cn("space-y-2.5 xl:min-w-[260px] xl:max-w-[300px]", isNarrowMobile && "space-y-2")}> 
                  <ButtonLink href={nextStepHref as any} variant={nextStepHref === "/enviar" ? "secondary" : "primary"} className="flex h-11 w-full justify-center text-sm">
                    {nextStepLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </ButtonLink>
                  <p className="text-sm leading-snug text-white/54 xl:text-[13px]">{nextStepDescription}</p>
                </div>
              </div>

              <div className={cn("grid gap-3 sm:grid-cols-3 xl:gap-2.5", isSimpleHub && "hidden")}>
                <HubStat label="Ultimo gesto" value={lastGestureSummary.value} hint={lastGestureSummary.hint} icon={Clock3} tone={lastSubmission ? "blue" : latestLocalEntry ? "amber" : "white"} />
                <HubStat label="Pendente agora" value={pendingNowCount} hint={hasErrors ? "Fila local com erros." : localCount > 0 ? `${localCount} no aparelho.` : pendingCount > 0 ? `${pendingCount} em moderacao.` : "Nada pendente agora."} icon={Smartphone} tone={hasErrors ? "amber" : pendingNowCount > 0 ? "blue" : "white"} />
                <HubStat label="Impacto acumulado" value={impactCount} hint={impactHint} icon={Activity} tone={impactTone} />
              </div>
            </SectionCard>
          )}

          {!isZeroState && showRichSections && (
            <SectionCard className="space-y-4 border-white/10 bg-white/5 xl:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Sessão recente</p>
                  <h2 className="text-lg font-semibold text-white">O que você fez por último</h2>
                </div>
                <Clock3 className="h-4 w-4 text-[color:var(--color-accent)]" />
              </div>

              {mission ? (
                <div className="space-y-3 rounded-[20px] border border-[color:var(--color-accent)]/15 bg-[color:var(--color-accent)]/8 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]">Missão ativa</p>
                      <p className="text-sm font-semibold text-white">{mission.groupName}</p>
                    </div>
                    <Badge variant="outline" className="border-white/10 bg-white/5 text-[9px] uppercase tracking-[0.18em] text-white/48">
                      {missionStats?.completed ?? 0}/{missionStats?.total ?? 0}
                    </Badge>
                  </div>
                  <p className="text-sm text-white/58">A missão continua aberta. O próximo passo segue a rota atual sem reiniciar contexto.</p>
                </div>
              ) : lastSubmission ? (
                <div className="space-y-3 rounded-[20px] border border-white/8 bg-black/25 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Último envio</p>
                      <p className="truncate text-base font-semibold text-white">{lastSubmission.stationName}</p>
                      <p className="text-sm text-white/52">{fuelLabels[lastSubmission.fuelType]} · {formatCurrencyBRL(Number(lastSubmission.price))}</p>
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">{formatRecencyLabel(lastSubmission.submittedAt)}</p>
                  </div>
                  <SubmissionStatusLine status={lastSubmission.status} submittedAt={lastSubmission.submittedAt} moderatedAt={lastSubmission.status !== "pending" ? lastSubmission.updatedAt : null} />
                </div>
              ) : latestLocalEntry ? (
                <div className="space-y-3 rounded-[20px] border border-white/8 bg-black/25 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Última ação local</p>
                      <p className="truncate text-base font-semibold text-white">{latestLocalEntry.stationName}</p>
                      <p className="text-sm text-white/52">{fuelLabels[latestLocalEntry.fuelType]} · {getSubmissionQueueStatusLabel(latestLocalEntry.status)}</p>
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">{formatRecencyLabel(latestLocalEntry.updatedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/48">
                    <MapPin className="h-3.5 w-3.5 text-[color:var(--color-accent)]" />
                    <span>Pronta para retomar em {latestLocalEntry.city}</span>
                  </div>
                  <ButtonLink href={buildSubmissionQueueHref(latestLocalEntry) as any} variant="secondary" className="w-full justify-center">
                    Retomar pendência
                  </ButtonLink>
                </div>
              ) : (
                <div className="rounded-[20px] border border-white/8 bg-black/25 p-4 text-sm text-white/54">
                  Ainda não há sessão recente registrada. O primeiro envio vai criar essa memória.
                </div>
              )}
            </SectionCard>
          )}

          {!isZeroState && showRichSections && (
            <SectionCard className="space-y-4 border-white/10 bg-white/5 xl:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Fila e revisão</p>
                  <h2 className="text-lg font-semibold text-white">O que está pendente agora</h2>
                </div>
                <Badge variant="outline" className="border-white/10 bg-white/5 text-[9px] uppercase tracking-[0.18em] text-white/48">
                  {pendingNowCount} ativos
                </Badge>
              </div>
              <SubmissionStatus submissions={submissions} localQueue={localQueue} />
            </SectionCard>
          )}

          {!isZeroState && showRichSections && (
            <SectionCard className="space-y-4 border-white/10 bg-white/5 xl:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Impacto acumulado</p>
                  <h2 className="text-lg font-semibold text-white">Seu impacto</h2>
                </div>
                <Badge variant="outline" className="border-white/10 bg-white/5 text-[9px] uppercase tracking-[0.18em] text-white/48">
                  {trust?.trustStage ?? "novo"}
                </Badge>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {trust ? <ReputationBadge stage={trust.trustStage} score={trust.score} streak={trust.streakDays} /> : null}
                {impact ? (
                  <TerritorialImpactCard impact={impact} />
                ) : (
                  <div className="rounded-[28px] border border-white/8 bg-black/25 p-5 text-sm text-white/52">
                    Ainda não há uma área forte para mostrar. Ela aparece conforme os envios forem aprovados.
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {!isZeroState && showRichSections && (
            <SectionCard className="space-y-4 border-white/10 bg-white/5 xl:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Memória e atalhos</p>
                  <h2 className="text-lg font-semibold text-white">Retomar sem procurar de novo</h2>
                </div>
                <Badge variant="outline" className="border-white/10 bg-white/5 text-[9px] uppercase tracking-[0.18em] text-white/48">
                  {recentStations.length} recentes
                </Badge>
              </div>

              {recentStations.length > 0 ? (
                <HubRecents stations={stations} />
              ) : (
                <div className="rounded-[20px] border border-white/8 bg-black/25 p-4 text-sm text-white/54">
                  Ainda sem atalhos gravados. A primeira volta ao mapa cria memória aqui.
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <ButtonLink href="/enviar" variant="secondary">Ver pendências</ButtonLink>
                <ButtonLink href="/" variant="ghost" className="border border-white/8 bg-white/5 text-white/72">Ver mapa</ButtonLink>
              </div>
            </SectionCard>
          )}
        </div>

        <aside data-layout-role="rail" data-rail-useful="hub" className="hidden space-y-4 xl:block xl:sticky xl:top-28">
          <ProofOfLifeReinforcement city={defaultCity} />
        </aside>
      </section>
    </div>
  );
}








