"use client";

import { useState, useEffect, useCallback } from "react";
import type { FuelType, ReportStatus } from "@/lib/types";

export interface MySubmission {
  reportId: string;
  stationId: string;
  stationName: string;
  fuelType: FuelType;
  price: string;
  status: ReportStatus | "stored";
  submittedAt: string;
  updatedAt: string;
  moderationNote?: string | null;
}

const STORAGE_KEY = "bomba-aberta:my-submissions";

export function useMySubmissions() {
  const [submissions, setSubmissions] = useState<MySubmission[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSubmissions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse my submissions", e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
    }
  }, [submissions, isLoaded]);

  const addSubmission = useCallback((entry: Omit<MySubmission, "updatedAt">) => {
    setSubmissions(prev => {
      // Avoid duplicates
      if (prev.find(s => s.reportId === entry.reportId)) return prev;
      return [{ ...entry, updatedAt: new Date().toISOString() }, ...prev].slice(0, 20);
    });
  }, []);

  const updateSubmissionStatus = useCallback((reportId: string, status: ReportStatus, moderationNote?: string | null) => {
    setSubmissions(prev => prev.map(s => 
      s.reportId === reportId ? { ...s, status, moderationNote, updatedAt: new Date().toISOString() } : s
    ));
  }, []);

  return {
    submissions,
    addSubmission,
    updateSubmissionStatus,
    isLoaded
  };
}
