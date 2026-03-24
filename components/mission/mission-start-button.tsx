"use client";

import { Button } from "@/components/ui/button";
import { useMissionContext } from "./mission-context";

interface MissionStartButtonProps {
  groupId: string;
  groupName: string;
  stationIds: string[];
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "accent" | "ghost";
}

export function MissionStartButton({ 
  groupId, 
  groupName, 
  stationIds, 
  children,
  variant = "accent",
  killSwitches
}: MissionStartButtonProps & { killSwitches?: { disable_mission_mode: boolean } }) {
  const { startMission } = useMissionContext();

  if (killSwitches?.disable_mission_mode) {
    return (
      <Button variant="secondary" disabled className="opacity-50 grayscale cursor-not-allowed">
        Operação Suspensa
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      onClick={() => startMission(groupId, groupName, stationIds)}
    >
      {children}
    </Button>
  );
}
