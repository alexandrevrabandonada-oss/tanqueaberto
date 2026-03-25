"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bug, Users, Activity, ExternalLink, Filter, Search, FlaskConical, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TesterActivity {
  nickname: string;
  lastSeen: string;
  sessionCount: number;
  bugReports: number;
  status: 'active' | 'idle';
  recentEvent: string;
}

export function TesterMonitorPanel() {
  const [testers, setTesters] = useState<TesterActivity[]>([]);
  const [filter, setFilter] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data for initial implementation - in a real scenario, this would come from a server action
  useEffect(() => {
    setTesters([
      { nickname: "Tester_Alpha", lastSeen: "2 min ago", sessionCount: 12, bugReports: 3, status: 'active', recentEvent: "price_submit_start" },
      { nickname: "Beta_Collector", lastSeen: "15 min ago", sessionCount: 8, bugReports: 1, status: 'idle', recentEvent: "home_view" },
      { nickname: "Field_Expert", lastSeen: "Now", sessionCount: 25, bugReports: 0, status: 'active', recentEvent: "quick_action_clicked" }
    ]);
  }, []);

  const filteredTesters = testers.filter(t => t.nickname.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-indigo-400" />
            <p className="text-xs uppercase tracking-[0.2em] text-white/42 font-bold">Beta Ops</p>
          </div>
          <h2 className="mt-1 text-2xl font-black text-white italic uppercase tracking-tight">Monitoramento de Testers</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
            <input 
              type="text" 
              placeholder="Filtrar tester..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-full pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-indigo-500/50 transition-all w-48"
            />
          </div>
          <Button variant="secondary" className="h-9 rounded-full bg-white/5 border border-white/10">
            <Filter className="h-3.5 w-3.5 mr-2" />
            Segmentar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] border border-white/8 bg-indigo-500/5 p-5 flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase text-indigo-400/60 tracking-widest leading-none">Testers Ativos</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-white italic">08</span>
            <span className="text-xs text-white/40 font-bold uppercase tracking-tighter">em campo</span>
          </div>
        </div>
        <div className="rounded-[28px] border border-white/8 bg-orange-500/5 p-5 flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase text-orange-400/60 tracking-widest leading-none">Bugs Relatados</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-white italic">14</span>
            <span className="text-xs text-white/40 font-bold uppercase tracking-tighter">últimas 24h</span>
          </div>
        </div>
        <div className="rounded-[28px] border border-white/8 bg-green-500/5 p-5 flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase text-green-400/60 tracking-widest leading-none">Taxa de Conversão</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-white italic">92%</span>
            <span className="text-xs text-white/40 font-bold uppercase tracking-tighter">vs 74% público</span>
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-white/12 bg-black/40 overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5">
              <th className="px-6 py-4 text-[10px] font-black uppercase text-white/30 tracking-widest border-b border-white/5">Tester</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-white/30 tracking-widest border-b border-white/5 text-center">Status</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-white/30 tracking-widest border-b border-white/5">Atividade Recente</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-white/30 tracking-widest border-b border-white/5 text-center">Sessões</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-white/30 tracking-widest border-b border-white/5 text-center">Retornos (Bugs)</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-white/30 tracking-widest border-b border-white/5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredTesters.map((tester) => (
              <tr key={tester.nickname} className="hover:bg-white/2 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                      <Users className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{tester.nickname}</p>
                      <p className="text-[10px] text-white/30 italic">Visto {tester.lastSeen}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center">
                    <div className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tight",
                      tester.status === 'active' ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-white/5 text-white/30 border border-white/5"
                    )}>
                      <div className={cn("h-1.5 w-1.5 rounded-full", tester.status === 'active' ? "bg-green-500 animate-pulse" : "bg-white/20")} />
                      {tester.status === 'active' ? "Live" : "Idle"}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-mono text-indigo-300 opacity-80">{tester.recentEvent}</p>
                    <div className="h-1 w-24 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500/50 w-2/3" />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center font-bold text-white text-sm">{tester.sessionCount}</td>
                <td className="px-6 py-4 text-center">
                  <Badge variant={tester.bugReports > 0 ? "warning" : "outline"} className="text-[10px] font-black">
                    {tester.bugReports > 0 ? (
                      <div className="flex items-center gap-1">
                        <Bug className="h-3 w-3" />
                        {tester.bugReports}
                      </div>
                    ) : (
                      "LIMPO"
                    )}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-white/10">
                    <ExternalLink className="h-4 w-4 text-white/30 group-hover:text-white transition-colors" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredTesters.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-white/30 italic">Nenhum tester encontrado com este filtro.</p>
          </div>
        )}
      </div>

      <div className="rounded-[28px] border border-white/8 bg-black/20 p-6 flex items-start gap-4">
        <div className="p-3 bg-orange-500/20 text-orange-400 rounded-2xl border border-orange-500/30">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white uppercase italic tracking-tight">Observação Operacional</h4>
          <p className="text-xs text-white/50 leading-relaxed max-w-2xl">
            Os testers relatando IDs de postos zerados ou atritos de câmera devem ser priorizados para feedback individual. O Test Mode isola esses erros do pipeline de produção.
          </p>
        </div>
      </div>
    </div>
  );
}
