"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useMission } from "@/hooks/use-mission";

type MissionContextType = ReturnType<typeof useMission>;

const MissionContext = createContext<MissionContextType | null>(null);

export function MissionProvider({ children }: { children: ReactNode }) {
  const missionService = useMission();
  return (
    <MissionContext.Provider value={missionService}>
      {children}
    </MissionContext.Provider>
  );
}

export function useMissionContext() {
  const context = useContext(MissionContext);
  if (!context) {
    throw new Error("useMissionContext must be used within a MissionProvider");
  }
  return context;
}
