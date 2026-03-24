import { 
  TrendingUp, 
  AlertCircle, 
  Target, 
  Lightbulb, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type OperationalSynthesis as SynthesisType } from "@/lib/ops/feedback-analyzer";

interface OperationalSynthesisProps {
  synthesis: SynthesisType;
}

export function OperationalSynthesis({ synthesis }: OperationalSynthesisProps) {
  return (
    <div className="bg-[#111] border border-blue-500/10 rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-5 border-b border-white/5 bg-blue-500/[0.02] flex items-center justify-between">
        <h2 className="font-black text-sm uppercase tracking-[0.2em] flex items-center gap-2.5 text-blue-400">
          <Zap className="w-4 h-4" />
          Síntese Operacional
        </h2>
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-blue-500/30" />
          ))}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Lado Esquerdo: O que está funcionando / O que está travando */}
        <div className="space-y-6">
          <div className="space-y-3">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
               <TrendingUp className="w-3.5 h-3.5" />
               Pulso Positivo
             </h3>
             <div className="space-y-2">
                {synthesis.workingWell.map((item, i) => (
                  <div key={i} className="flex gap-2.5 items-start bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl italic">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-50/80 leading-relaxed font-medium">{item}</p>
                  </div>
                ))}
             </div>
          </div>

          <div className="space-y-3">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
               <AlertCircle className="w-3.5 h-3.5" />
               Atrito Detectado
             </h3>
             <div className="space-y-2">
                {synthesis.blockedBy.map((item, i) => (
                  <div key={i} className="flex gap-2.5 items-start bg-orange-500/5 border border-orange-500/10 p-3 rounded-xl italic">
                    <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-50/80 leading-relaxed font-medium">{item}</p>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Lado Direito: Voz da Rua e Foco */}
        <div className="space-y-6 bg-white/[0.02] border border-white/5 rounded-2xl p-5">
           <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2 border-b border-white/5 pb-2">
                <Lightbulb className="w-3.5 h-3.5" />
                Foco para Amanhã
              </h3>
              <p className="text-sm font-bold text-white/90 leading-relaxed italic">
                &ldquo;{synthesis.focusTomorrow}&rdquo;
              </p>
           </div>

           <div className="space-y-4 pt-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2 border-b border-white/5 pb-2">
                <Target className="w-3.5 h-3.5" />
                Padrões de Feedback
              </h3>
              <div className="space-y-3">
                {synthesis.topPatterns.map((pattern, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm",
                        pattern.category === 'INFRA' ? "bg-red-500/20 text-red-400 border border-red-500/10" :
                        pattern.category === 'UX' ? "bg-blue-500/20 text-blue-400 border border-blue-500/10" :
                        "bg-amber-500/20 text-amber-400 border border-amber-500/10"
                      )}>
                        {pattern.category}
                      </span>
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                        {pattern.count} Ocorrências
                      </span>
                    </div>
                    <div className="space-y-1">
                      {pattern.recentMessages.map((msg, j) => (
                        <p key={j} className="text-[10px] text-white/40 leading-tight italic truncate pl-2 border-l border-white/10">
                          {msg}
                        </p>
                      ))}
                    </div>
                    <div className="flex items-start gap-2 pt-1">
                       <ArrowRight className="w-3 h-3 text-white/20 mt-0.5 shrink-0" />
                       <p className="text-[10px] font-bold text-white/60 leading-normal">{pattern.suggestedAction}</p>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>

      <div className="px-6 py-3 bg-white/[0.01] border-t border-white/5 flex items-center justify-between">
         <div className="flex items-center gap-2 text-white/20">
            <Info className="w-3 h-3" />
            <span className="text-[8px] font-black uppercase tracking-[0.3em]">IA Assisted Synthesis</span>
         </div>
         <span className="text-[8px] font-black uppercase tracking-widest text-white/10">Bomba Aberta Labs</span>
      </div>
    </div>
  );
}
