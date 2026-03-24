import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { FeedbackCluster } from "@/lib/ops/feedback-clustering";
import { generateCopiableSummary } from "@/lib/ops/feedback-clustering";

interface VozDaRuaClustersProps {
  clusters: FeedbackCluster[];
}

export function VozDaRuaClusters({ clusters }: VozDaRuaClustersProps) {
  const handleCopySummary = () => {
    const text = generateCopiableSummary(clusters);
    navigator.clipboard.writeText(text);
    alert("Resumo copiado para a área de transferência!");
  };

  if (clusters.length === 0) {
    return (
      <div className="rounded-[22px] border border-white/8 bg-black/30 p-8 text-center">
        <p className="text-sm text-white/40 italic">Nenhum padrão de feedback detectado no momento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Voz da Rua 2.0</p>
          <h2 className="mt-1 text-xl font-bold text-white">Clusters de Atrito</h2>
        </div>
        <Button 
          variant="secondary" 
          onClick={handleCopySummary}
          className="rounded-full bg-white/5 border border-white/10 hover:bg-white/10 h-9"
        >
          <Copy className="h-3.5 w-3.5 mr-2" />
          Copiar Resumo
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {clusters.map((cluster) => (
          <div 
            key={cluster.id} 
            className="flex flex-col h-full rounded-[28px] border border-white/12 bg-black/60 p-5 shadow-xl transition-all hover:bg-black/80"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={cluster.priority === 'alta' ? 'danger' : cluster.priority === 'media' ? 'warning' : 'outline'} className="uppercase text-[9px]">
                    {cluster.priority === 'alta' && <AlertCircle className="h-2.5 w-2.5 mr-1 inline" />}
                    {cluster.priority}
                  </Badge>
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{cluster.count} casos</span>
                </div>
                <h3 className="mt-2 text-lg font-black text-white italic uppercase tracking-tight leading-tight">{cluster.motif}</h3>
                {cluster.city && (
                  <p className="mt-1 text-xs font-bold text-[color:var(--color-accent)] uppercase">Território: {cluster.city}</p>
                )}
              </div>
            </div>

            <div className="mt-4 flex-1 space-y-3">
              <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-2">Exemplos Recentes</p>
                <ul className="space-y-2">
                  {cluster.recentMessages.map((msg, i) => (
                    <li key={i} className="text-sm italic text-white/60 leading-relaxed group">
                      <span className="text-white/20 mr-2">&ldquo;</span>
                      {msg}
                      <span className="text-white/20 ml-2">&rdquo;</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl bg-[color:var(--color-accent)]/10 border border-[color:var(--color-accent)]/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 bg-[color:var(--color-accent)] text-black rounded-full p-1 shrink-0">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-[color:var(--color-accent)] tracking-widest mb-1">Ação Sugerida</p>
                    <p className="text-sm font-semibold text-white leading-tight">{cluster.suggestedAction}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {cluster.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-[9px] bg-white/2 border-white/5">{tag}</Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
