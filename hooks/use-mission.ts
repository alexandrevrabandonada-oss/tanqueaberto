"use client";

import { useState, useEffect, useCallback } from "react";
import { trackProductEvent } from "@/lib/telemetry/client";

export interface MissionStation {
  id: string;
  name: string;
  neighborhood: string | null;
}

export interface MissionState {
  groupId: string;
  groupName: string;
  stationIds: string[];
  currentIndex: number;
  completedIds: string[];
  skippedIds: string[];
  startedAt: string;
  lastSubmissionAt?: string;
}

const STORAGE_KEY = "bomba_aberta_active_mission";

export function useMission() {
  const [mission, setMission] = useState<MissionState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setMission(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved mission", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (isLoaded) {
      if (mission) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mission));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [mission, isLoaded]);

  const startMission = useCallback((groupId: string, groupName: string, stationIds: string[]) => {
    const newState: MissionState = {
      groupId,
      groupName,
      stationIds,
      currentIndex: 0,
      completedIds: [],
      skippedIds: [],
      startedAt: new Date().toISOString()
    };
    setMission(newState);
    
    void trackProductEvent({
      eventType: "mission_started",
      pagePath: "/",
      pageTitle: "Mapa vivo",
      scopeType: "mission",
      scopeId: groupId,
      payload: { 
        groupName, 
        stationsCount: stationIds.length,
        version: "1.0"
      }
    });
  }, []);

  const endMission = useCallback(() => {
    if (mission) {
      void trackProductEvent({
        eventType: "mission_aborted",
        pagePath: "/",
        pageTitle: "Mapa vivo",
        scopeType: "mission",
        scopeId: mission.groupId,
        payload: { 
          completedCount: mission.completedIds.length,
          skippedCount: mission.skippedIds.length,
          currentIndex: mission.currentIndex
        }
      });
    }
    setMission(null);
  }, [mission]);

  const nextStation = useCallback((completedId?: string) => {
    if (!mission) return;

    const currentId = mission.stationIds[mission.currentIndex];
    const isCompleted = !!completedId;

    const nextIndex = mission.currentIndex + 1;
    const isLast = nextIndex >= mission.stationIds.length;

    const now = new Date().toISOString();
    const durationMs = mission.lastSubmissionAt 
      ? new Date(now).getTime() - new Date(mission.lastSubmissionAt).getTime()
      : new Date(now).getTime() - new Date(mission.startedAt).getTime();

    const updatedMission: MissionState = {
      ...mission,
      currentIndex: nextIndex,
      completedIds: isCompleted ? [...mission.completedIds, currentId] : mission.completedIds,
      skippedIds: !isCompleted ? [...mission.skippedIds, currentId] : mission.skippedIds,
      lastSubmissionAt: isCompleted ? now : mission.lastSubmissionAt
    };

    if (isLast) {
      void trackProductEvent({
        eventType: "mission_completed",
        pagePath: "/",
        pageTitle: "Mapa vivo",
        scopeType: "mission",
        scopeId: mission.groupId,
        payload: { 
          completedCount: updatedMission.completedIds.length,
          skippedCount: updatedMission.skippedIds.length,
          totalDurationMs: new Date().getTime() - new Date(mission.startedAt).getTime()
        }
      });
      setMission(null);
    } else {
      setMission(updatedMission);
      void trackProductEvent({
        eventType: isCompleted ? "mission_station_completed" : "mission_station_skipped",
        pagePath: "/enviar",
        pageTitle: "Enviar preço",
        scopeType: "mission",
        scopeId: mission.groupId,
        stationId: currentId,
        payload: { 
          isCompleted,
          durationSinceLastMs: durationMs,
          currentIndex: mission.currentIndex
        }
      });
    }
  }, [mission]);

  const currentStationId = mission ? mission.stationIds[mission.currentIndex] : null;
  const progress = mission ? Math.round(((mission.currentIndex) / mission.stationIds.length) * 100) : 0;
  const stats = mission ? {
    total: mission.stationIds.length,
    current: mission.currentIndex + 1,
    completed: mission.completedIds.length,
    skipped: mission.skippedIds.length
  } : null;

  return {
    mission,
    isLoaded,
    startMission,
    endMission,
    nextStation,
    currentStationId,
    progress,
    stats
  };
}
