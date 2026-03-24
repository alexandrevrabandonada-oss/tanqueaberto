"use client";

import { useSubmissionHistory } from "@/components/history/submission-history-context";
import { useMissionContext } from "@/components/mission/mission-context";
import { SubmissionStatus } from "./submission-status";
import { MissionCard } from "./mission-card";
import { useEffect, useState } from "react";
import { loadSubmissionQueue, type SubmissionQueueEntry } from "@/lib/queue/submission-queue";
import { trackProductEvent } from "@/lib/telemetry/client";
import { Trophy, ShieldCheck, UserCircle } from "lucide-react";
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

interface CollectorHubProps {
  stations: StationWithReports[];
}

export function CollectorHub({ stations }: CollectorHubProps) {
  const { submissions, reporterNickname, isLoaded: historyLoaded } = useSubmissionHistory();
  const { mission, stats: missionStats, isLoaded: missionLoaded, currentStationId } = useMissionContext();
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

    void trackProductEvent({
      eventType: "hub_opened",
      pagePath: "/hub",
      pageTitle: "Meu Hub",
      payload: { 
        hasNickname: !!reporterNickname,
        submissionsCount: submissions.length,
        hasMission: !!mission,
        trustStage: trust?.trustStage
      }
    });
  }, [reporterNickname, submissions.length, mission, trust?.trustStage]);

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

  // Determine city context for Proof of Life
  const defaultCity = stations.length > 0 ? stations[0].city : "Resende";

  return (
    <div className="space-y-6">
      {/* 1. Hero de Ativação (Estado Zero) */}
      {isZeroState ? (
        <HubActivationHero type="NEW_COLLECTOR" />
      ) : isInactiveVeteran ? (
        <HubActivationHero type="INACTIVE_VETERAN" />
      ) : null}

      {/* Cycle Line */}
      {!isZeroState && (
        <CycleDash 
          approvedCount={approvedCount}
          pendingCount={pendingCount}
          localCount={localCount}
          hasMission={!!mission}
        />
      )}

      {/* Hub 4.0: Agenda Operacional (Substitui Retomada e SmartActions) */}
      {!isZeroState && (
        <HubOperatingAgenda 
          stations={stations}
          mission={mission}
          localQueue={localQueue}
          submissions={submissions}
          coords={coords}
        />
      )}

      {/* Hub 2.0: Recommendations & Smart Actions */}
      {reporterNickname && (
        <HubGeofencingCTA nickname={reporterNickname} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Reputation Badge */}
        {trust && (
          <ReputationBadge stage={trust.trustStage} score={trust.score} streak={trust.streakDays} />
        )}

        {/* Impact Territorial */}
        {impact && (
          <TerritorialImpactCard impact={impact} />
        )}
      </div>

      {/* Complementary Proof of Life */}
      <ProofOfLifeReinforcement city={defaultCity} />

      {/* Main Sections */}
      <div className="grid gap-6">
        
        {mission && (
          <MissionCard mission={mission} stats={missionStats} stations={stations} />
        )}

        {/* Só mostrar recentes se houver dados ou não for estado zero absoluto */}
        {!isZeroState && (
          <HubRecents stations={stations} />
        )}

        <SubmissionStatus 
          submissions={submissions} 
          localQueue={localQueue} 
        />
      </div>
    </div>
  );
}

