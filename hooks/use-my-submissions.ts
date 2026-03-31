"use client";

import { useState, useEffect, useCallback } from "react";
import type { FuelType, ReportStatus } from "@/lib/types";
import { normalizeProgressiveNickname, persistProgressiveIdentityNickname, readProgressiveIdentityProfile } from "@/lib/identity/progressive";

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
  reporterNickname?: string | null;
}

const STORAGE_KEY = "bomba-aberta:my-submissions";

export function useMySubmissions() {
  const [submissions, setSubmissions] = useState<MySubmission[]>([]);
  const [reporterNickname, setReporterNickname] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let parsedSubmissions: MySubmission[] = [];

    if (saved) {
      try {
        parsedSubmissions = JSON.parse(saved);
        setSubmissions(parsedSubmissions);
      } catch (e) {
        console.error("Failed to parse my submissions", e);
      }
    }

    const savedProfile = readProgressiveIdentityProfile();
    const normalizedProfileNickname = normalizeProgressiveNickname(savedProfile?.nickname ?? null);
    const firstSubmissionNickname = normalizeProgressiveNickname(parsedSubmissions[0]?.reporterNickname ?? null);
    const nextNickname = normalizedProfileNickname ?? firstSubmissionNickname;

    if (!normalizedProfileNickname && firstSubmissionNickname) {
      persistProgressiveIdentityNickname(firstSubmissionNickname, "submission");
    }

    setReporterNickname(nextNickname);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
    }
  }, [submissions, isLoaded]);

  const addSubmission = useCallback((entry: Omit<MySubmission, "updatedAt">) => {
    const normalizedNickname = normalizeProgressiveNickname(entry.reporterNickname ?? null);
    if (normalizedNickname) {
      persistProgressiveIdentityNickname(normalizedNickname, "submission");
      setReporterNickname(normalizedNickname);
    }

    setSubmissions(prev => {
      if (prev.find(s => s.reportId === entry.reportId)) return prev;
      return [{ ...entry, reporterNickname: normalizedNickname, updatedAt: new Date().toISOString() }, ...prev].slice(0, 20);
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
    reporterNickname,
    isLoaded
  };
}
