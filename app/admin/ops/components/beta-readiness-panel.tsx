"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  TrendingUp, 
  History, 
  Camera, 
  MapPin, 
  Bug, 
  Zap,
  Copy,
  Save,
  Loader2,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getBetaReadinessAction, saveDecisionSnapshotAction, getDecisionHistoryAction } from "@/app/admin/ops/actions";
import { type ReadinessResult } from "@/lib/ops/readiness-engine";

export function BetaReadinessPanel() {
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadData() {
    setIsLoading(true);
    const result = await getBetaReadinessAction();
    const historyData = await getDecisionHistoryAction();
    setReadiness(result);
    setHistory(historyData);
    setIsLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSnapshot = async () => {
    if (!readiness) return;
    setIsSaving(true);
    await saveDecisionSnapshotAction(readiness);
    await loadData();
    setIsSaving(false);
  };

  const copyToClipboard = () => {
    if (!readiness) return;
    const text = `
BOMBA ABERTA BETA — RESUMO DE PRONTIDÃO
Data: ${new Date().toLocaleDateString('pt-BR')}
Status: ${readiness.status} (${readiness.score}/100)
Recomendação: ${readiness.recommendation}

Métricas:
- Sucesso de Envio: ${readiness.metrics.successRate}%
- Taxa de Atrito: ${readiness.metrics.frictionRate}%
- Qualidade do Dado: ${readiness.metrics.dataQualityScore}/100
- Densidade de Bugs: ${readiness.metrics.bugDensity}%

Riscos:
${readiness.risks.length > 0 ? readiness.risks.map(r => `• ${r}`).join('\n') : 'Nenhum risco crítico detectado.'}
    `.trim();
    navigator.clipboard.writeText(text);
  };

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!readiness) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Main Score */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-[40px] bg-white/[0.03] border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className={cn(
          "absolute -top-24 -right-24 w-64 h-64 blur-[100px] opacity-20 rounded-full",
          readiness.status === 'GO' ? "bg-green-500" : readiness.status === 'CAUTION' ? "bg-amber-500" : "bg-red-500"
        )} />

        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <Badge className={cn(
              "px-4 py-1.5 rounded-full text-[11px] font-black tracking-widest uppercase border-0",
              readiness.status === 'GO' ? "bg-green-500 text-black" : readiness.status === 'CAUTION' ? "bg-amber-500 text-black" : "bg-red-500 text-white"
            )}>
              {readiness.status === 'GO' ? "Pronto para Ampliar" : readiness.status === 'CAUTION' ? "Expandir com Cautela" : "Abertura Retida"}
            </Badge>
            <span className="text-white/30 text-xs font-mono font-bold tracking-tighter">BETA_READY_SCORE: {readiness.score}</span>
          </div>
          
          <h2 className="text-4xl font-black text-white italic leading-tight uppercase tracking-tight">
            {readiness.recommendation}
          </h2>
          
          <p className="text-white/50 text-sm max-w-xl leading-relaxed">
            Esta decisão é baseada na análise automática de telemetria, qualidade operacional e feedback dos coletores nos últimos 7 dias.
          </p>

          <div className="flex items-center gap-3 pt-4">
            <Button onClick={copyToClipboard} variant="secondary" className="bg-white/5 border-white/10 hover:bg-white/10 text-[11px] font-black uppercase tracking-wider h-11 px-6 rounded-2xl">
              <Copy className="w-4 h-4 mr-2" />
              Copiar Resumo
            </Button>
            <Button onClick={handleSaveSnapshot} disabled={isSaving} variant="secondary" className="bg-white/5 border-white/10 hover:bg-white/10 text-[11px] font-black uppercase tracking-wider h-11 px-6 rounded-2xl">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Snapshot
            </Button>
          </div>
        </div>

        <div className="relative group">
           <div className="absolute inset-0 bg-white/10 blur-3xl rounded-full opacity-50 group-hover:opacity-80 transition-opacity" />
           <div className={cn(
             "relative h-48 w-48 rounded-full border-8 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xl",
             readiness.status === 'GO' ? "border-green-500/30" : readiness.status === 'CAUTION' ? "border-amber-500/30" : "border-red-500/30"
           )}>
             <span className="text-6xl font-black italic text-white leading-none">{readiness.score}</span>
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mt-1">Readiness</span>
           </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Sucesso de Envio" value={`${readiness.metrics.successRate}%`} icon={<TrendingUp />} trend="last 7d" subLabel="Aprovação de lances" />
        <MetricCard label="Taxa de Atrito" value={`${readiness.metrics.frictionRate}%`} icon={<Zap />} trend="low" subLabel="Erros reportados" />
        <MetricCard label="Qualidade do Dado" value={readiness.metrics.dataQualityScore} icon={<Camera />} trend="stable" subLabel="Média Trust Score" />
        <MetricCard label="Densidade de Bugs" value={readiness.metrics.bugDensity} icon={<Bug />} trend="manageable" subLabel="Feedbacks / 100 sessões" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Risks Section */}
        <div className="p-8 rounded-[32px] bg-red-500/5 border border-red-500/20 space-y-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-black uppercase tracking-widest text-sm">Riscos & Bloqueios</h3>
          </div>
          <div className="space-y-3">
            {readiness.risks.length > 0 ? readiness.risks.map((risk, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/10">
                <XCircle className="w-4 h-4 text-red-400 mt-0.5" />
                <p className="text-sm font-bold text-red-200">{risk}</p>
              </div>
            )) : (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-500/10 border border-green-500/10">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <p className="text-sm font-bold text-green-200 uppercase tracking-tighter italic">Nenhum risco crítico de expansão.</p>
              </div>
            )}
          </div>
        </div>

        {/* History Section */}
        <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/40">
              <History className="w-5 h-5" />
              <h3 className="font-black uppercase tracking-widest text-sm text-white">Snapshots de Decisão</h3>
            </div>
          </div>
          
          <div className="space-y-3 overflow-y-auto max-h-[280px] custom-scrollbar pr-2">
            {history.map((snap) => (
              <div key={snap.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/[0.08] transition-all">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center font-black italic",
                    snap.status === 'GO' ? "bg-green-500/20 text-green-400" : snap.status === 'CAUTION' ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"
                  )}>
                    {snap.readiness_score}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{snap.status}</p>
                    <p className="text-xs text-white/30">{new Date(snap.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
                <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                   <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {history.length === 0 && (
              <p className="text-center py-8 text-white/20 italic text-sm">Nenhum snapshot registrado.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, trend, subLabel }: any) {
  return (
    <div className="p-6 rounded-[28px] bg-white/[0.03] border border-white/8 flex flex-col gap-2 group hover:bg-white/[0.05] hover:border-white/15 transition-all">
      <div className="flex items-center justify-between">
        <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
          {React.cloneElement(icon, { size: 18 })}
        </div>
        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter opacity-40 group-hover:opacity-100 transition-opacity">
          {trend}
        </Badge>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black italic text-white">{value}</span>
          <span className="text-[9px] font-bold uppercase text-white/20">{subLabel}</span>
        </div>
      </div>
    </div>
  );
}
