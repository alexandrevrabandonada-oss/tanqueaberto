"use client";

import { useEffect } from "react";
import { trackProductEvent } from "@/lib/telemetry/client";

interface GroupTelemetryProps {
  groupId: string;
  groupName: string;
  city: string;
  stage: string;
  score: number;
}

export function GroupTelemetry({ groupId, groupName, city, stage, score }: GroupTelemetryProps) {
  useEffect(() => {
    void trackProductEvent({
      eventType: "group_landing_view" as any,
      pagePath: window.location.pathname,
      pageTitle: groupName,
      city,
      scopeType: "group",
      scopeId: groupId,
      payload: { stage, score }
    });
  }, [groupId, groupName, city, stage, score]);

  return null;
}
