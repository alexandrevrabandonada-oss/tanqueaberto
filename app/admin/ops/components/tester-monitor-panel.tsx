"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bug, Users, Activity, ExternalLink, Filter, Search, FlaskConical, AlertTriangle, ArrowUpCircle, ShieldCheck, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateCollectorCohortAction, getCohortMetricsAction } from "@/app/admin/ops/actions";

interface TesterActivity {
  nickname: string;
  ip_hash: string;
  lastSeen: string;
  sessionCount: number;
  bugReports: number;
  status: 'active' | 'idle';
  recentEvent: string;
  cohort: string;
  score: number;
}

interface CohortMetric {
  id: string;
  label: string;
  memberCount: number;
  totalReports: number;
  aprRate: number;
  avgScore: number;
}

export function TesterMonitorPanel() {
  const [testers, setTesters] = useState<TesterActivity[]>([]);
  const [metrics, setMetrics] = useState<CohortMetric[]>([]);
  const [filter, setFilter] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function loadData() {
    setIsRefreshing(true);
    // In a real app, this would be a single server action fetching combined data
    const cohortMetrics = await getCohortMetricsAction();
    setMetrics(cohortMetrics);
    
    // Mocking the detailed list for UI demonstration, but usually fetched from DB
    setTesters([
      { nickname: "Tester_Alpha", ip_hash: "hash_123", lastSeen: "2 min ago", sessionCount: 12, bugReports: 3, status: 'active', recentEvent: "price_submit_start", cohort: "ALPHA", score: 92 },
      { nickname: "Beta_Collector", ip_hash: "hash_456", lastSeen: "15 min ago", sessionCount: 8, bugReports: 1, status: 'idle', recentEvent: "home_view", cohort: "VETERAN", score: 78 },
      { nickname: "Field_Expert", ip_hash: "hash_789", lastSeen: "Now", sessionCount: 25, bugReports: 0, status: 'active', recentEvent: "quick_action_clicked", cohort: "ALPHA", score: 98 },
      { nickname: "New_Joiner", ip_hash: "hash_001", lastSeen: "1h ago", sessionCount: 2, bugReports: 0, status: 'idle', recentEvent: "onboarding", cohort: "NEWBIE", score: 55 }
    ]);
    setIsRefreshing(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const handlePromote = async (nickname: string, ipHash: string, current: string) => {
    const next = current === 'NEWBIE' ? 'VETERAN' : current === 'VETERAN' ? 'EXPERT' : 'ALPHA';
    if (next === current) return;
    
    await updateCollectorCohortAction(nickname, ipHash, next, "Manual promotion from dashboard");
    loadData();
  };

  const filteredTesters = testers.filter(t => t.nickname.toLowerCase().includes(filter.toLowerCase()));

  const getCohortBadge = (cohort: string) => {
    switch(cohort) {
      case 'ALPHA': return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1"><ShieldCheck className="w-3 h-3"/> ALPHA</Badge>;
      case 'EXPERT': return <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 gap-1"><GraduationCap className="w-3 h-3"/> EXPERT</Badge>;
      case 'VETERAN': return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 gap-1">VETERANO</Badge>;
      default: return <Badge variant="outline" className="text-white/20">NOVATO</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-indigo-400" />
            <p className="text-xs uppercase tracking-[0.2em] text-white/42 font-bold">Beta Ops</p>
          </div>
          <h2 className="mt-1 text-2xl font-black text-white italic uppercase tracking-tight">Segmentação de Testers</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
            <input 
              type="text" 
              placeholder="Filtrar por nome ou coorte..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-full pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-indigo-500/50 transition-all w-48"
            />
          </div>
          <Button onClick={() => loadData()} disabled={isRefreshing} variant="secondary" className="h-9 rounded-full bg-white/5 border border-white/10">
            <Activity className={cn("h-3.5 w-3.5 mr-2", isRefreshing && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cohort Stats Comparison */}
      <div className="grid gap-4 md:grid-cols-4">
        {metrics.map(m => (
          <div key={m.id} className="rounded-[28px] border border-white/8 bg-white/[0.02] p-5 flex flex-col gap-1 hover:bg-white/[0.04] transition-colors">
            <p className="text-[10px] font-black uppercase text-white/30 tracking-widest leading-none">{m.label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white italic">{m.memberCount}</span>
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">membros</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[9px] font-bold text-white/40 uppercase">Precisão</span>
              <span className="text-[11px] font-mono font-bold text-green-400">{m.aprRate}%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-green-500/40" style={{ width: `${m.aprRate}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[32px] border border-white/12 bg-black/40 overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5">
              <th className="px-6 py-4 text-[10px] font-black uppercase text-white/30 tracking-widest border-b border-white/5">Coletor</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-white/30 tracking-widest border-b border-white/5 text-center">Coorte</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-white/30 tracking-widest border-b border-white/5 text-center">Reputação</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-white/30 tracking-widest border-b border-white/5">Atividade</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-white/30 tracking-widest border-b border-white/5 text-center">Bugs</th>
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
                   {getCohortBadge(tester.cohort)}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="inline-flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                    <div className="h-1 w-12 bg-white/10 rounded-full overflow-hidden">
                       <div className="h-full bg-amber-500" style={{ width: `${tester.score}%` }} />
                    </div>
                    <span className="text-[10px] font-mono font-bold">{tester.score}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-mono text-indigo-300 opacity-80">{tester.recentEvent}</p>
                    <p className="text-[9px] text-white/20 uppercase font-black tracking-widest">{tester.sessionCount} sessões</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <Badge variant={tester.bugReports > 0 ? "warning" : "outline"} className="text-[10px] font-black">
                    {tester.bugReports || "0"}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {tester.cohort !== 'ALPHA' && (
                      <Button 
                        onClick={() => handlePromote(tester.nickname, tester.ip_hash, tester.cohort)}
                        variant="ghost" 
                        className="h-8 rounded-full text-[9px] font-black uppercase tracking-wider text-green-400/50 hover:text-green-400 hover:bg-green-400/10"
                      >
                        <ArrowUpCircle className="w-3 h-3 mr-1" />
                        Promover
                      </Button>
                    )}
                    <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-white/10">
                      <ExternalLink className="h-4 w-4 text-white/30 group-hover:text-white transition-colors" />
                    </Button>
                  </div>
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

      <div className="rounded-[28px] border border-white/8 bg-indigo-500/5 p-6 flex items-start gap-4">
        <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
          <FlaskConical className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white uppercase italic tracking-tight">Estratégia de Coortes</h4>
          <p className="text-xs text-white/50 leading-relaxed max-w-2xl">
            As coortes segmentam a experiência do usuário. Membros <b>ALPHA</b> têm acesso antecipado a novas UIs e telemetria estendida, enquanto <b>NEWBIES</b> operam no ambiente beta padrão para estabilização de rollout.
          </p>
        </div>
      </div>
    </div>
  );
}
