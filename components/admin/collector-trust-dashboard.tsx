"use client";

import { ShieldCheck, ShieldAlert, User, Search, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { formatRecencyLabel } from "@/lib/format/time";
import { useState } from "react";

export interface CollectorTrustEntry {
  nickname: string;
  ip_hash: string;
  score: number;
  total_reports: number;
  approved_reports: number;
  rejected_reports: number;
  trust_stage: 'new' | 'trusted' | 'review_needed' | 'blocked';
  last_report_at: string;
}

interface CollectorTrustDashboardProps {
  collectors: CollectorTrustEntry[];
}

export function CollectorTrustDashboard({ collectors }: CollectorTrustDashboardProps) {
  const [search, setSearch] = useState("");

  const filtered = collectors.filter(c => 
    c.nickname?.toLowerCase().includes(search.toLowerCase()) || 
    c.ip_hash?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <SectionCard className="flex items-center gap-3">
        <Search className="h-4 w-4 text-white/30" />
        <input 
          type="text" 
          placeholder="Filtrar por nome ou IP hash..." 
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </SectionCard>

      <div className="overflow-hidden rounded-[24px] border border-white/5 bg-black/20">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/5 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-white/40">
            <tr>
              <th className="px-6 py-4">Coletor</th>
              <th className="px-6 py-4 text-center">Score</th>
              <th className="px-6 py-4">Estágio</th>
              <th className="px-6 py-4 text-right">Histórico (A/R/T)</th>
              <th className="px-6 py-4 text-right">Última Atividade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((c) => (
              <tr key={`${c.nickname}:${c.ip_hash}`} className="transition hover:bg-white/2">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/40">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{c.nickname || "Anônimo"}</p>
                      <p className="text-[10px] text-white/30 font-mono truncate max-w-[120px]">{c.ip_hash}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`text-lg font-bold ${
                      c.score >= 80 ? 'text-green-400' : 
                      c.score >= 50 ? 'text-blue-400' : 
                      c.score >= 30 ? 'text-orange-400' : 'text-red-400'
                    }`}>
                      {c.score}
                    </span>
                    <div className="flex gap-0.5">
                       {Array.from({ length: 5 }).map((_, i) => (
                         <div key={i} className={`h-1 w-2 rounded-full ${i < c.score / 20 ? 'bg-current opacity-80' : 'bg-white/10'}`} />
                       ))}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {c.trust_stage === 'trusted' ? (
                    <Badge variant="outline" className="border-green-500/20 text-green-400 gap-1 px-2 py-0.5">
                      <ShieldCheck className="h-3 w-3" /> CONFIAVEL
                    </Badge>
                  ) : c.trust_stage === 'new' ? (
                    <Badge variant="outline" className="border-blue-500/20 text-blue-400 px-2 py-0.5">
                      NOVO
                    </Badge>
                  ) : c.trust_stage === 'blocked' ? (
                    <Badge variant="outline" className="border-red-500/20 text-red-400 gap-1 px-2 py-0.5">
                       BLOQUEADO
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-orange-500/20 text-orange-400 gap-1 px-2 py-0.5">
                      <ShieldAlert className="h-3 w-3" /> REVISAR
                    </Badge>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 text-xs">
                    <span className="text-green-400 font-medium">{c.approved_reports}</span>
                    <span className="text-white/20">/</span>
                    <span className="text-red-400 font-medium">{c.rejected_reports}</span>
                    <span className="text-white/20">/</span>
                    <span className="text-white/60 font-medium">{c.total_reports}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-xs text-white/40">
                  {c.last_report_at ? formatRecencyLabel(c.last_report_at) : "---"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-white/20">
                  Nenhum coletor encontrado com este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
