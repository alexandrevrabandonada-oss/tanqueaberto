import { getCollectorTrustList } from "@/lib/data/queries";
import { 
  UserCheck, 
  ArrowLeft, 
  Search, 
  Star, 
  Activity, 
  ShieldCheck,
  AlertCircle,
  Clock
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function CollectorDirectoryPage() {
  const collectors = await getCollectorTrustList(100);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <header className="mb-8 ">
        <Link 
          href="/admin/ops" 
          className="flex items-center gap-2 text-white/40 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest text-[9px]">Voltar para Ops</span>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Diretório de Coletores</h1>
        <p className="text-white/50 text-sm mt-1">Auditoria de reputação e histórico de contribuição.</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
         <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
               <thead className="bg-white/[0.02] border-b border-white/5">
                  <tr>
                     <th className="p-4 font-bold uppercase tracking-widest text-[9px] text-white/30">Nickname / IP</th>
                     <th className="p-4 font-bold uppercase tracking-widest text-[9px] text-white/30 text-center">Score</th>
                     <th className="p-4 font-bold uppercase tracking-widest text-[9px] text-white/30 text-center">Estágio</th>
                     <th className="p-4 font-bold uppercase tracking-widest text-[9px] text-white/30 text-center">Reports</th>
                     <th className="p-4 font-bold uppercase tracking-widest text-[9px] text-white/30 text-center">Status</th>
                     <th className="p-4 font-bold uppercase tracking-widest text-[9px] text-white/30 text-right">Ação</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {collectors.map((c: any) => (
                    <tr key={c.id} className="hover:bg-white/[0.01] transition-colors">
                       <td className="p-4">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                <UserCheck className="w-4 h-4 text-white/40" />
                             </div>
                             <div>
                                <p className="font-bold">{c.nickname || 'Anônimo'}</p>
                                <p className="text-[10px] text-white/20 font-mono">{c.ip_hash?.slice(0, 12)}...</p>
                             </div>
                          </div>
                       </td>
                       <td className="p-4 text-center">
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                             <Star className="w-3 h-3 text-amber-500" />
                             <span className="font-mono font-bold text-amber-500">{c.score}</span>
                          </div>
                       </td>
                       <td className="p-4 text-center">
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter",
                            c.trust_stage === 'very_trusted' ? "bg-green-500 text-white" :
                            c.trust_stage === 'trusted' ? "bg-blue-500 text-white" : 
                            c.trust_stage === 'review_needed' ? "bg-amber-500 text-black" :
                            c.trust_stage === 'blocked' ? "bg-red-500 text-white" : "bg-white/10 text-white/40"
                          )}>
                             {c.trust_stage}
                          </span>
                       </td>
                       <td className="p-4 text-center">
                          <div className="flex flex-col items-center">
                             <span className="font-bold">{c.total_reports}</span>
                             <span className="text-[8px] text-white/20 uppercase">Total</span>
                          </div>
                       </td>
                       <td className="p-4 text-center">
                          <div className="flex justify-center gap-1">
                             <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Ativo" />
                             <span className="text-[10px] text-white/40 italic">Online</span>
                          </div>
                       </td>
                       <td className="p-4 text-right">
                          <button className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white">
                             <ShieldCheck className="w-4 h-4" />
                          </button>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
