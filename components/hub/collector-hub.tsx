"use client";

import { useSubmissionHistory } from "@/components/history/submission-history-context";
import { useMissionContext } from "@/components/mission/mission-context";
import { SubmissionStatus } from "./submission-status";
import { MissionCard } from "./mission-card";
import { SmartActions } from "./smart-actions";
import { useEffect, useState } from "react";
import { loadSubmissionQueue, type SubmissionQueueEntry } from "@/lib/queue/submission-queue";
import { trackProductEvent } from "@/lib/telemetry/client";
import { Trophy, ShieldCheck, UserCircle } from "lucide-react";
import type { StationWithReports } from "@/lib/types";
import { HubRecents } from "./hub-recents";
import { CycleDash } from "./cycle-dash";

interface CollectorHubProps {
  stations: StationWithReports[];
}

export function CollectorHub({ stations }: CollectorHubProps) {
  const { submissions, reporterNickname, isLoaded: historyLoaded } = useSubmissionHistory();
  const { mission, stats: missionStats, isLoaded: missionLoaded } = useMissionContext();
  const [localQueue, setLocalQueue] = useState<SubmissionQueueEntry[]>([]);
  const [localLoaded, setLocalLoaded] = useState(false);

  useEffect(() => {
    const loadLocal = async () => {
      const queue = await loadSubmissionQueue();
      setLocalQueue(queue);
      setLocalLoaded(true);
    };
    loadLocal();

    void trackProductEvent({
      eventType: "hub_opened",
      pagePath: "/hub",
      pageTitle: "Meu Hub",
      payload: { 
        hasNickname: !!reporterNickname,
        submissionsCount: submissions.length,
        hasMission: !!mission
      }
    });
  }, [reporterNickname, submissions.length, mission]);

  if (!historyLoaded || !missionLoaded || !localLoaded) {
    return null;
  }

  const approvedCount = submissions.filter(s => s.status === "approved").length;
  const pendingCount = submissions.filter(s => s.status === "pending").length;
  const localItems = localQueue.filter(s => s.status !== "success");
  const localCount = localItems.length;
  const hasErrors = localItems.some(s => s.status === "failed" || s.status === "photo_required" || s.status === "expired");

  return (
    <div className="space-y-6">
      {/* Cycle Line */}
      <CycleDash 
        approvedCount={approvedCount}
        pendingCount={pendingCount}
        localCount={localCount}
        hasMission={!!mission}
      />

      {/* Main Sections */}
      <div className="grid gap-6">
        <SmartActions 
          localCount={localCount}
          hasMission={!!mission}
          approvedCount={approvedCount}
          hasErrors={hasErrors}
        />
        
        {mission && (
          <MissionCard mission={mission} stats={missionStats} stations={stations} />
        )}

        <HubRecents stations={stations} />

        <SubmissionStatus 
          submissions={submissions} 
          localQueue={localQueue} 
        />
      </div>
    </div>
  );
}
