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
  variant = "accent" 
}: MissionStartButtonProps) {
  const { startMission } = useMissionContext();

  return (
    <Button
      variant={variant}
      onClick={() => startMission(groupId, groupName, stationIds)}
    >
      {children}
    </Button>
  );
}
