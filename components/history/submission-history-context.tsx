"use client";

import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { useMySubmissions } from "@/hooks/use-my-submissions";
import { fetchReportStatuses } from "./actions";

type HistoryContextType = ReturnType<typeof useMySubmissions> & {
  syncStatuses: () => Promise<void>;
};

const HistoryContext = createContext<HistoryContextType | null>(null);

export function SubmissionHistoryProvider({ children }: { children: ReactNode }) {
  const history = useMySubmissions();

  const syncStatuses = async () => {
    if (!history.isLoaded || history.submissions.length === 0) return;

    const pendingIds = history.submissions
      .filter(s => s.status === "pending")
      .map(s => s.reportId);

    if (pendingIds.length === 0) return;

    try {
      const updatedReports = await fetchReportStatuses(pendingIds);

      for (const report of updatedReports) {
        if (report.status !== "pending") {
          history.updateSubmissionStatus(report.id, report.status, report.moderationNote);
        }
      }
    } catch (e) {
      console.error("Failed to sync report statuses", e);
    }
  };

  // Sync on mount and periodically
  useEffect(() => {
    if (history.isLoaded) {
      syncStatuses();
      const interval = setInterval(syncStatuses, 60000); // Every minute
      return () => clearInterval(interval);
    }
  }, [history.isLoaded]);

  return (
    <HistoryContext.Provider value={{ ...history, syncStatuses }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useSubmissionHistory() {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error("useSubmissionHistory must be used within a SubmissionHistoryProvider");
  }
  return context;
}
