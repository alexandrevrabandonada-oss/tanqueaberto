"use client";

import type { FuelType } from "@/lib/types";

export interface RouteContext {
  active: boolean;
  city: string;
  groupId: string | null;
  fuelFilter: FuelType | "all";
  targetStationId: string | null;
  skippedStationIds: string[];
  completedStationIds: string[];
  startedAt: string | null;
}

const ROUTE_CONTEXT_KEY = "bomba-aberta:route-context";

export function readRouteContext(): RouteContext {
  if (typeof window === "undefined") {
    return { active: false, city: "", groupId: null, fuelFilter: "all", targetStationId: null, skippedStationIds: [], completedStationIds: [], startedAt: null };
  }

  try {
    const raw = localStorage.getItem(ROUTE_CONTEXT_KEY);
    if (!raw) {
      return { active: false, city: "", groupId: null, fuelFilter: "all", targetStationId: null, skippedStationIds: [], completedStationIds: [], startedAt: null };
    }
    const parsed = JSON.parse(raw) as Partial<RouteContext>;
    return {
      active: Boolean(parsed.active),
      city: parsed.city ?? "",
      groupId: parsed.groupId ?? null,
      fuelFilter: parsed.fuelFilter ?? "all",
      targetStationId: parsed.targetStationId ?? null,
      skippedStationIds: parsed.skippedStationIds ?? [],
      completedStationIds: parsed.completedStationIds ?? [],
      startedAt: parsed.startedAt ?? null
    };
  } catch {
    return { active: false, city: "", groupId: null, fuelFilter: "all", targetStationId: null, skippedStationIds: [], completedStationIds: [], startedAt: null };
  }
}

export function persistRouteContext(context: RouteContext) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ROUTE_CONTEXT_KEY, JSON.stringify(context));
}

export function startRoute(city: string, groupId: string | null, fuelFilter: FuelType | "all") {
  const context: RouteContext = {
    active: true,
    city,
    groupId,
    fuelFilter,
    targetStationId: null,
    skippedStationIds: [],
    completedStationIds: [],
    startedAt: new Date().toISOString()
  };
  persistRouteContext(context);
}

export function stopRoute() {
  const context = readRouteContext();
  persistRouteContext({ ...context, active: false, targetStationId: null });
}

export function setRouteTargetStation(stationId: string | null) {
  const context = readRouteContext();
  if (!context.active) return;
  if (context.targetStationId === stationId) return;
  persistRouteContext({ ...context, targetStationId: stationId });
}

export function skipStationInRoute(stationId: string) {
  const context = readRouteContext();
  if (!context.active) return;
  if (!context.skippedStationIds.includes(stationId)) {
    context.skippedStationIds.push(stationId);
    if (context.targetStationId === stationId) {
      context.targetStationId = null;
    }
    persistRouteContext(context);
  }
}

export function completeStationInRoute(stationId: string) {
  const context = readRouteContext();
  if (!context.active) return;
  if (!context.completedStationIds.includes(stationId)) {
    context.completedStationIds.push(stationId);
    if (context.targetStationId === stationId) {
      context.targetStationId = null;
    }
    persistRouteContext(context);
  }
}

export function isStationInRoute(stationId: string): boolean {
  const context = readRouteContext();
  return context.active && (context.skippedStationIds.includes(stationId) || context.completedStationIds.includes(stationId));
}

