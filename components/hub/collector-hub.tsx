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

export function CollectorHub() {
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
  const localCount = localQueue.filter(s => s.status !== "success").length;

  return (
    <div className="space-y-6">
      {/* Header Stat Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        <div className="flex items-center gap-2 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-2 text-xs font-bold text-green-400 shrink-0">
          <ShieldCheck className="h-3.5 w-3.5" />
          {approvedCount} Aprovados
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-400 shrink-0">
          <Trophy className="h-3.5 w-3.5" />
          {pendingCount} Em Moderação
        </div>
        {localCount > 0 && (
          <div className="flex items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs font-bold text-blue-400 shrink-0">
            <UserCircle className="h-3.5 w-3.5" />
            {localCount} No Aparelho
          </div>
        )}
      </div>

      {/* Main Sections */}
      <div className="grid gap-6">
        <SmartActions 
          localCount={localCount}
          hasMission={!!mission}
          approvedCount={approvedCount}
        />
        
        {mission && (
          <MissionCard mission={mission} stats={missionStats} />
        )}

        <SubmissionStatus 
          submissions={submissions} 
          localQueue={localQueue} 
        />
      </div>
    </div>
  );
}
