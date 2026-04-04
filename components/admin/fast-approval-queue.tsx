"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, X, Zap, ChevronRight, ChevronLeft, ShieldCheck, ShieldAlert, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { fuelLabels } from "@/lib/format/labels";
import { formatCurrencyBRL } from "@/lib/format/currency";
import { formatRecencyLabel } from "@/lib/format/time";
import { moderateReportQueueAction } from "@/app/admin/actions";
import type { ReportWithStation } from "@/lib/types";

interface FastApprovalQueueProps {
  reports: ReportWithStation[];
}

function hasUsableImageSrc(src: string | null | undefined) {
  const value = String(src ?? "").trim();
  return value.startsWith("https://") || value.startsWith("http://") || value.startsWith("/");
}

const routingLabels = {
  review_normal: "Revisão normal",
  fast_lane: "Fast-lane",
  auto_approved: "Autoaprovado"
} as const;

const riskLabels = {
  low: "Risco baixo",
  medium: "Risco moderado",
  high: "Risco alto"
} as const;

export function FastApprovalQueue({ reports }: FastApprovalQueueProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPending, startTransition] = useTransition();

  const groupedReports = useMemo(() => {
    const groups: Record<string, ReportWithStation[]> = {};
    const result: { main: ReportWithStation; confirmations: ReportWithStation[] }[] = [];

    reports.forEach((report) => {
      const rid = report.reconciliationId || `single-${report.id}`;
      if (!groups[rid]) {
        groups[rid] = [];
      }
      groups[rid].push(report);
    });

    Object.values(groups).forEach((group) => {
      // Sort group: non-confirmations first (main), then confirmations
      group.sort((a, b) => (a.isConfirmation ? 1 : 0) - (b.isConfirmation ? 0 : 1));
      result.push({
        main: group[0],
        confirmations: group.slice(1)
      });
    });

    // Sort result by priority score of main report
    return result.sort((a, b) => (b.main.priorityScore || 0) - (a.main.priorityScore || 0));
  }, [reports]);

  const currentGroup = groupedReports[currentIndex];
  const currentReport = currentGroup?.main;

  const nextReport = useCallback(() => {
    if (currentIndex < groupedReports.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, groupedReports.length]);

  const prevReport = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const approveCurrent = useCallback(() => {
    if (!currentReport || !currentGroup || isPending) return;
    const formData = new FormData();
    formData.append("reportId", currentReport.id);
    formData.append("decision", "approved");
    formData.append("moderationNote", `Aprovação rápida (${currentGroup.confirmations.length + 1} reports agrupados)`);
    // Add confirmation IDs if any
    currentGroup.confirmations.forEach(c => formData.append("confirmationIds", c.id));
    
    startTransition(async () => {
      const result = await moderateReportQueueAction(formData);
      if (result?.ok) {
        if (currentIndex < groupedReports.length - 1) {
          setCurrentIndex(currentIndex + 1);
        }
        router.refresh();
      }
    });
  }, [currentIndex, currentGroup, currentReport, isPending, groupedReports.length, router]);

  const rejectCurrent = useCallback(() => {
    if (!currentReport || !currentGroup || isPending) return;
    const formData = new FormData();
    formData.append("reportId", currentReport.id);
    formData.append("decision", "rejected");
    formData.append("moderationNote", `Rejeição rápida (${currentGroup.confirmations.length + 1} reports agrupados)`);
    // Add confirmation IDs if any
    currentGroup.confirmations.forEach(c => formData.append("confirmationIds", c.id));
    
    startTransition(async () => {
      const result = await moderateReportQueueAction(formData);
      if (result?.ok) {
        if (currentIndex < groupedReports.length - 1) {
          setCurrentIndex(currentIndex + 1);
        }
        router.refresh();
      }
    });
  }, [currentIndex, currentGroup, currentReport, isPending, groupedReports.length, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;

      if (e.key.toLowerCase() === "a") {
        approveCurrent();
      } else if (e.key.toLowerCase() === "r") {
        rejectCurrent();
      } else if (e.key === "ArrowRight") {
        nextReport();
      } else if (e.key === "ArrowLeft") {
        prevReport();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [approveCurrent, rejectCurrent, nextReport, prevReport]);

  if (reports.length === 0) {
    return (
      <SectionCard className="flex flex-col items-center justify-center py-12 text-center text-white/40">
        <Zap className="mb-3 h-12 w-12 opacity-20" />
        <p>A fast-lane pendente está vazia.</p>
        <p className="text-sm">Sem revisão curta aguardando agora.</p>
      </SectionCard>
    );
  }

  if (!currentReport) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[color:var(--color-accent)]" />
          <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--color-accent)]">Fast-lane pendente</span>
        </div>
        <div className="text-xs text-white/40">
          {currentIndex + 1} de {groupedReports.length} grupos
        </div>
      </div>

      <SectionCard className="overflow-hidden p-0">
        <div className="relative aspect-[4/3] w-full bg-black/40 md:aspect-video">
          {hasUsableImageSrc(currentReport.photoUrl) ? (
            <Image 
              src={currentReport.photoUrl} 
              alt="Foto do posto" 
              fill 
              className="object-contain"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-black/30 text-xs uppercase tracking-[0.18em] text-white/34">
              Sem foto válida
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-12">
            <h3 className="text-2xl font-bold text-white">{currentReport.station.name}</h3>
            <p className="text-sm text-white/60">{currentReport.station.neighborhood}, {currentReport.station.city}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-white/8 border-b border-white/8 bg-black/20">
          <div className="p-4 text-center">
            <p className="text-[10px] uppercase tracking-widest text-white/40">Combustível</p>
            <p className="mt-1 font-semibold text-white">{fuelLabels[currentReport.fuelType]}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-[10px] uppercase tracking-widest text-white/40">Preço</p>
            <p className="mt-1 text-2xl font-bold text-[color:var(--color-accent)]">{formatCurrencyBRL(currentReport.price)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-white/40">
              Enviado {formatRecencyLabel(currentReport.reportedAt)} por <span className="text-white/60">{currentReport.reporterNickname || "Anônimo"}</span>
              {currentReport.collectorTrustStage && (
                <div className="flex items-center gap-1">
                   {currentReport.collectorTrustStage === 'trusted' ? (
                     <Badge variant="outline" className="h-4 border-green-500/20 text-green-400 gap-1 px-1 text-[9px]">
                       <ShieldCheck className="h-2.5 w-2.5" /> CONFIAVEL
                     </Badge>
                   ) : currentReport.collectorTrustStage === 'new' ? (
                     <Badge variant="outline" className="h-4 border-blue-500/20 text-blue-400 px-1 text-[9px]">
                       NOVO
                     </Badge>
                   ) : (
                     <Badge variant="outline" className="h-4 border-orange-500/20 text-orange-400 gap-1 px-1 text-[9px]">
                       <ShieldAlert className="h-2.5 w-2.5" /> REVISAR
                     </Badge>
                   )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="h-5 border-blue-500/20 px-1.5 text-[9px] text-blue-300">
                {currentReport.contributorTrustLevel ?? "N0"}
              </Badge>
              <Badge variant="outline" className="h-5 border-[color:var(--color-accent)]/20 px-1.5 text-[9px] text-[color:var(--color-accent)]">
                {routingLabels[currentReport.submissionRouting ?? "review_normal"]}
              </Badge>
              <Badge variant="outline" className="h-5 border-white/10 px-1.5 text-[9px] text-white/70">
                {riskLabels[currentReport.submissionRiskLevel ?? "medium"]}
              </Badge>
            </div>
            {currentReport.contributorHistorySummary?.[0] ? (
              <div className="text-[10px] text-white/40">{currentReport.contributorHistorySummary[0]}</div>
            ) : null}
            {currentReport.submissionRoutingReasons?.[0] ? (
              <div className="text-[10px] text-white/44">Rota: {currentReport.submissionRoutingReasons[0]}</div>
            ) : null}
            {currentReport.submissionRiskReasons?.[0] ? (
              <div className="text-[10px] text-white/44">Risco: {currentReport.submissionRiskReasons[0]}</div>
            ) : null}
            {currentGroup.confirmations.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-[color:var(--color-accent)] font-medium">
                <Check className="h-3 w-3" />
                +{currentGroup.confirmations.length} confirmações idênticas agrupadas
              </div>
            )}
            {currentReport.locationConfidence === "low" && (
              <div className="flex items-center gap-1.5 text-[10px] text-orange-400 font-medium">
                <Badge variant="warning" className="h-4 px-1.5 py-0 text-[9px]">LONGE</Badge>
                Dista {currentReport.locationDistance ? Math.round(currentReport.locationDistance) : "?"}m do posto
              </div>
            )}
            {currentReport.metadata?.price_discrepancy && (
              <div className="flex items-center gap-1.5 text-[10px] text-[color:var(--color-danger)] font-medium">
                <Badge variant="danger" className="h-4 px-1.5 py-0 text-[9px]">DIFERENÇA ALTA</Badge>
                Preço muito diferente do último aprovado
              </div>
            )}
          </div>
          <Badge variant={currentReport.priorityScore && currentReport.priorityScore > 50 ? "accent" : "warning"}>
            Score: {currentReport.priorityScore ?? 0}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-px bg-white/8">
          <button 
            onClick={approveCurrent}
            disabled={isPending}
            className="group flex flex-col items-center justify-center bg-black/40 py-8 transition hover:bg-[color:var(--color-accent)]/10 disabled:opacity-50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[color:var(--color-accent)] text-[color:var(--color-accent)] group-hover:bg-[color:var(--color-accent)] group-hover:text-black">
              <Check className="h-6 w-6" />
            </div>
            <span className="mt-3 text-xs font-bold uppercase tracking-widest text-[color:var(--color-accent)]">Aprovar (A)</span>
          </button>
          <button 
            onClick={rejectCurrent}
            disabled={isPending}
            className="group flex flex-col items-center justify-center bg-black/40 py-8 transition hover:bg-[color:var(--color-danger)]/10 disabled:opacity-50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[color:var(--color-danger)] text-[color:var(--color-danger)] group-hover:bg-[color:var(--color-danger)] group-hover:text-white">
              <X className="h-6 w-6" />
            </div>
            <span className="mt-3 text-xs font-bold uppercase tracking-widest text-[color:var(--color-danger)]">Rejeitar (R)</span>
          </button>
        </div>
      </SectionCard>

      <div className="flex justify-between px-2">
        <Button 
          variant="secondary" 
          onClick={prevReport} 
          disabled={currentIndex === 0}
          className="h-8 px-2 text-[10px]"
        >
          <ChevronLeft className="mr-1 h-3 w-3" /> ANTERIOR
        </Button>
        <Button 
          variant="secondary" 
          onClick={nextReport} 
          disabled={currentIndex === groupedReports.length - 1}
          className="h-8 px-2 text-[10px]"
        >
          PRÓXIMO <ChevronRight className="ml-1 h-3 w-3" />
        </Button>
      </div>

      <div className="rounded-[18px] border border-white/5 bg-white/2 p-3 text-[10px] text-white/30">
        <p>DICA: Use as teclas <kbd className="rounded border border-white/20 px-1 font-sans">A</kbd> e <kbd className="rounded border border-white/20 px-1 font-sans">R</kbd> para decidir rápido e as setas para navegar.</p>
      </div>
    </div>
  );
}


