"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useMySubmissions, type MySubmission } from "@/hooks/use-my-submissions";
import type { ReportStatus } from "@/lib/types";

export type InboxEventType = 'queued' | 'audited' | 'approved' | 'rejected' | 'needs_adjustment' | 'visible';

export interface InboxItem {
  id: string; // submissionId + status + timestamp
  reportId: string;
  stationId: string;
  stationName: string;
  type: InboxEventType;
  message: string;
  timestamp: string;
  read: boolean;
}

const STORAGE_KEY = "bomba-aberta:collector-inbox";
const STATUS_MAP_KEY = "bomba-aberta:inbox-last-statuses";

export function useInbox() {
  const { submissions, isLoaded: submissionsLoaded } = useMySubmissions();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load inbox items
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse inbox items", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Persist inbox items
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isLoaded]);

  // Status Change Detection
  useEffect(() => {
    if (!submissionsLoaded || !isLoaded) return;

    const lastStatusesRaw = localStorage.getItem(STATUS_MAP_KEY);
    const lastStatuses: Record<string, ReportStatus | "stored"> = lastStatusesRaw ? JSON.parse(lastStatusesRaw) : {};
    
    const newItems: InboxItem[] = [];
    const currentStatuses: Record<string, ReportStatus | "stored"> = {};

    submissions.forEach((sub) => {
      currentStatuses[sub.reportId] = sub.status;
      const lastStatus = lastStatuses[sub.reportId];

      if (lastStatus && lastStatus !== sub.status) {
        // Status changed!
        let type: InboxEventType = 'audited';
        let message = `O status do envio para ${sub.stationName} mudou para ${sub.status}.`;

        if (sub.status === 'approved') {
          type = 'approved';
          message = `Boa! Seu envio para ${sub.stationName} foi aprovado e já ajuda a rede.`;
        } else if (sub.status === 'rejected') {
          type = 'rejected';
          message = `O envio para ${sub.stationName} não foi aprovado. Confira o motivo no histórico.`;
        }

        const id = `${sub.reportId}-${sub.status}-${Date.now()}`;
        
        // Evitar duplicatas de evento idêntico na mesma sessão
        if (!items.find(item => item.reportId === sub.reportId && item.type === type)) {
            newItems.push({
                id,
                reportId: sub.reportId,
                stationId: sub.stationId,
                stationName: sub.stationName,
                type,
                message,
                timestamp: new Date().toISOString(),
                read: false
            });
        }
      }
    });

    if (newItems.length > 0) {
      setItems(prev => [...newItems, ...prev].slice(0, 30));
    }

    localStorage.setItem(STATUS_MAP_KEY, JSON.stringify(currentStatuses));
  }, [submissions, submissionsLoaded, isLoaded]);

  const markAsRead = useCallback((id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, read: true } : item));
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  const unreadCount = useMemo(() => items.filter(i => !i.read).length, [items]);

  return {
    items,
    unreadCount,
    markAsRead,
    clearAll,
    isLoaded
  };
}
