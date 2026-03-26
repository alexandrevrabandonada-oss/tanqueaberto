"use client";

import { useSubmissionHistory } from "@/components/history/submission-history-context";
import { useMissionContext } from "@/components/mission/mission-context";
import { SubmissionStatus } from "./submission-status";
import { MissionCard } from "./mission-card";
import { useEffect, useState } from "react";
import { loadSubmissionQueue, type SubmissionQueueEntry } from "@/lib/queue/submission-queue";
import { trackProductEvent } from "@/lib/telemetry/client";
import { Trophy, ArrowRight, Clock3, Smartphone, Activity } from "lucide-react";
import type { StationWithReports } from "@/lib/types";
import { HubRecents } from "./hub-recents";
import { CycleDash } from "./cycle-dash";
import { ReputationBadge } from "./reputation-badge";
import { ProofOfLifeReinforcement } from "./proof-of-life-reforcement";
import { HubGeofencingCTA } from "./hub-geofencing-cta";
import { TerritorialImpactCard } from "./territorial-impact-card";
import { getCollectorTrustAction, getCollectorTerritorialImpactAction } from "@/app/hub/actions";
import type { CollectorTrust } from "@/lib/ops/collector-trust";
import type { CollectorTerritorialImpact } from "@/lib/ops/recorte-activity";
import { recordHubInteraction } from "@/lib/telemetry/attribution";
import { HubActivationHero } from "./hub-activation-hero";
import { HubOperatingAgenda } from "./hub-operating-agenda";
import { useGeolocation } from "@/hooks/use-geolocation";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl border", tone === "amber" ? "border-amber-500/20 bg-amber-500/10 text-amber-300" : tone === "blue" ? "border-blue-500/20 bg-blue-500/10 text-blue-300" : tone === "emerald" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/5 text-white/70")}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-xs text-white/48">{hint}</p>
    </div>
  );
}

export function CollectorHub({ stations }: CollectorHubProps) {
  const { submissions, reporterNickname, isLoaded: historyLoaded } = useSubmissionHistory();
  const { mission, stats: missionStats, isLoaded: missionLoaded } = useMissionContext();
  const [localQueue, setLocalQueue] = useState<SubmissionQueueEntry[]>([]);
  const [localLoaded, setLocalLoaded] = useState(false);
  const [trust, setTrust] = useState<CollectorTrust | null>(null);
  const [impact, setImpact] = useState<CollectorTerritorialImpact | null>(null);
  const { coords, getLocation } = useGeolocation();

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  useEffect(() => {
    const loadData = async () => {
      const [queue, trustData, impactData] = await Promise.all([
        loadSubmissionQueue(),
        getCollectorTrustAction(reporterNickname),
        reporterNickname ? getCollectorTerritorialImpactAction(reporterNickname) : Promise.resolve(null)
      ]);
      setLocalQueue(queue);
      setTrust(trustData);
      setImpact(impactData);
      setLocalLoaded(true);
      recordHubInteraction();
    };
    loadData();
  }, [reporterNickname]);

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

  if (!historyLoaded || !missionLoaded || !localLoaded) {
    return null;
  }

  const approvedCount = submissions.filter(s => s.status === "approved").length;
  const pendingCount = submissions.filter(s => s.status === "pending").length;
  const localItems = localQueue.filter(s => s.status !== "success");
  const localCount = localItems.length;
  const hasErrors = localItems.some(s => s.status === "failed" || s.status === "photo_required" || s.status === "expired");

  const isNewCollector = (trust?.missionsCompleted || 0) === 0 && approvedCount === 0;
  const isZeroState = isNewCollector && !mission && localCount === 0;
  const isInactiveVeteran = !isNewCollector && !mission && localCount === 0 && approvedCount > 0;
  const defaultCity = stations.length > 0 ? stations[0].city : "Resende";

  const nextStepHref = hasErrors ? "/enviar" : mission ? "/beta/missoes" : localCount > 0 ? "/enviar" : reporterNickname ? "/hub" : "/";
  const nextStepLabel = hasErrors ? "Corrigir fila" : mission ? "Retomar missão" : localCount > 0 ? "Enviar pendências" : isZeroState ? "Abrir mapa" : "Fazer envio real";
  const nextStepDescription = hasErrors ? "Há envio local exigindo revisão." : mission ? "A continuação do recorte está pronta." : localCount > 0 ? "O aparelho já tem fila aguardando." : isZeroState ? "Comece pelo mapa para ganhar contexto." : "Um novo envio melhora o mapa e o seu impacto.";

  return (
    <div data-layout-scope="hub-wide" className="space-y-8">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(390px,420px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(420px,460px)] xl:items-start">
        <div data-layout-role="main" className="space-y-4 min-w-0">
          <SectionCard className="space-y-5 border-[color:var(--color-accent)]/20 bg-[linear-gradient(180deg,rgba(255,204,0,0.08),rgba(255,255,255,0.03))] xl:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="warning" className="text-[10px] uppercase tracking-[0.22em]">Meu Hub</Badge>
                  <span className="text-[10px] uppercase tracking-[0.22em] text-white/36">Central operacional</span>
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold tracking-tight text-white xl:text-[2rem]">Seu próximo passo, sua fila e seu impacto, no mesmo lugar.</h1>
                  <p className="max-w-2xl text-sm text-white/58 xl:text-[15px]">O Hub continua claro para iniciante, mas ganha corpo em telas largas para você retomar contexto, agir e ver continuidade real.</p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[360px] 2xl:min-w-[400px] xl:grid-cols-1">
                <HubStat label="Próximo passo" value={nextStepLabel} hint={nextStepDescription} icon={ArrowRight} tone={hasErrors ? "amber" : mission ? "blue" : "emerald"} />
                <HubStat label="Fila local" value={localCount} hint={hasErrors ? "Há itens exigindo correção." : "Pendências do aparelho."} icon={Smartphone} tone={localCount > 0 ? "blue" : "white"} />
                <HubStat label="Impacto" value={impact?.stationsTouchedCount ?? approvedCount} hint={impact?.remainingGaps ? `${impact.remainingGaps} lacunas ainda abertas.` : "Envios já aprovados no mapa."} icon={Activity} tone="emerald" />
              </div>
            </div>
          </SectionCard>

          {isZeroState ? (
            <HubActivationHero type="NEW_COLLECTOR" />
          ) : isInactiveVeteran ? (
            <HubActivationHero type="INACTIVE_VETERAN" />
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)] xl:items-start">
            <div className="space-y-4 min-w-0">
              {!isZeroState && (
                <CycleDash
                  approvedCount={approvedCount}
                  pendingCount={pendingCount}
                  localCount={localCount}
                  hasMission={!!mission}
                />
              )}

              {!isZeroState && (
                <HubOperatingAgenda
                  stations={stations}
                  mission={mission}
                  localQueue={localQueue}
                  submissions={submissions}
                  coords={coords}
                />
              )}

              {mission && (
                <MissionCard mission={mission} stats={missionStats} stations={stations} />
              )}

              {!isZeroState && (
                <HubRecents stations={stations} />
              )}
            </div>

            <div className="space-y-4 min-w-0">
              <SectionCard className="space-y-4 border-white/10 bg-white/5 xl:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Sessão recente</p>
                    <h2 className="text-lg font-semibold text-white">Continuar de onde parou</h2>
                  </div>
                  <Clock3 className="h-4 w-4 text-[color:var(--color-accent)]" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-[20px] border border-white/8 bg-black/25 p-4">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Status</p>
                    <p className="mt-2 text-sm font-semibold text-white">{mission ? `Missão ativa em ${mission.groupName}` : isZeroState ? "Sem missão ativa" : "Hub pronto para continuidade"}</p>
                  </div>
                  <div className="rounded-[20px] border border-white/8 bg-black/25 p-4">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Sessão atual</p>
                    <p className="mt-2 text-sm font-semibold text-white">{submissions.length > 0 ? "Histórico visível e retornos prontos." : "Comece um envio para criar memória."}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <ButtonLink href={nextStepHref as any} variant={nextStepHref === "/enviar" ? "secondary" : "primary"} className="flex-1 justify-center">
                    {nextStepLabel}
                  </ButtonLink>
                  <ButtonLink href="/enviar" variant="secondary" className="justify-center md:hidden">
                    Enviar preço
                  </ButtonLink>
                </div>
              </SectionCard>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                {trust && <ReputationBadge stage={trust.trustStage} score={trust.score} streak={trust.streakDays} />}
                {impact && <TerritorialImpactCard impact={impact} />}
              </div>
            </div>
          </div>
        </div>

                <aside data-layout-role="rail" className="space-y-4 xl:sticky xl:top-28">
          <SectionCard className="space-y-4 border-white/10 bg-white/5 xl:p-5">
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Rail útil</p>
              <h3 className="text-lg font-semibold text-white">Sessão, fila e missão</h3>
              <p className="text-sm leading-relaxed text-white/54">A lateral acompanha o que continua vivo agora, sem duplicar o hero principal.</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[20px] border border-white/8 bg-black/25 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Sessão</p>
                <p className="mt-2 text-2xl font-semibold text-white">{submissions.length}</p>
                <p className="mt-1 text-xs text-white/48">Envios recentes no histórico.</p>
              </div>
              <div className="rounded-[20px] border border-white/8 bg-black/25 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Fila local</p>
                <p className="mt-2 text-2xl font-semibold text-white">{localQueue.filter((entry) => entry.status !== "success").length}</p>
                <p className="mt-1 text-xs text-white/48">Pendências que ainda pedem ação.</p>
              </div>
              <div className="rounded-[20px] border border-white/8 bg-black/25 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Missão</p>
                <p className="mt-2 text-sm font-semibold text-white">{mission ? mission.groupName : "Sem missão ativa"}</p>
                <p className="mt-1 text-xs text-white/48">Continuidade e próximo gesto visíveis aqui.</p>
              </div>
            </div>
          </SectionCard>

          <SubmissionStatus submissions={submissions} localQueue={localQueue} />
          {reporterNickname && <HubGeofencingCTA nickname={reporterNickname} />}
          <ProofOfLifeReinforcement city={defaultCity} />
        </aside>
      </section>
    </div>
  );
}







