"use client";

import { useEffect, useState, useTransition } from "react";
import { Zap, RefreshCcw, LayoutList, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { loadSubmissionQueue, removeSubmissionQueueEntry, markEntryAsSuccess, type SubmissionQueueEntry } from "@/lib/queue/submission-queue";
import { getQueuePhoto } from "@/lib/queue/photo-storage";
import { submitPriceReportAction } from "@/app/enviar/actions";

interface QueueAssistantProps {
  onQueueUpdated?: (items: SubmissionQueueEntry[]) => void;
  onReviewRequested?: (item: SubmissionQueueEntry) => void;
}

export function QueueAssistant({ onQueueUpdated, onReviewRequested }: QueueAssistantProps) {
  const [items, setItems] = useState<SubmissionQueueEntry[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isFlushing, setIsFlushing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, fail: 0 });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const refreshQueue = async () => {
      const queue = await loadSubmissionQueue();
      setItems(queue.filter(i => i.status !== "success" && i.status !== "expired"));
    };

    refreshQueue();
    const interval = setInterval(refreshQueue, 10000); // Poll occasionally

    const syncOnlineState = () => {
      setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    };
    window.addEventListener("online", syncOnlineState);
    window.addEventListener("offline", syncOnlineState);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", syncOnlineState);
      window.removeEventListener("offline", syncOnlineState);
    };
  }, []);

  const flushAll = async () => {
    if (isFlushing) return;
    setIsFlushing(true);
    const readyItems = items.filter(i => i.hasPhoto);
    setProgress({ current: 0, total: readyItems.length, success: 0, fail: 0 });

    for (let i = 0; i < readyItems.length; i++) {
      const item = readyItems[i];
      setProgress(p => ({ ...p, current: i + 1 }));

      const photo = await getQueuePhoto(item.draftKey);
      if (!photo) {
        setProgress(p => ({ ...p, fail: p.fail + 1 }));
        continue;
      }

      const formData = new FormData();
      formData.append("stationId", item.stationId);
      formData.append("fuelType", item.fuelType);
      formData.append("price", item.price);
      formData.append("nickname", item.nickname);
      formData.append("photo", photo);

      try {
        const result = await submitPriceReportAction({ error: null, errorCode: null, retryable: false, success: false }, formData);
        if (result.success) {
          await markEntryAsSuccess(item.draftKey);
          setProgress(p => ({ ...p, success: p.success + 1 }));
        } else {
          setProgress(p => ({ ...p, fail: p.fail + 1 }));
        }
      } catch {
        setProgress(p => ({ ...p, fail: p.fail + 1 }));
      }
    }

    const updatedQueue = await loadSubmissionQueue();
    setItems(updatedQueue.filter(i => i.status !== "success" && i.status !== "expired"));
    onQueueUpdated?.(updatedQueue);
    
    // Auto-hide after some delay if all successful
    setTimeout(() => setIsFlushing(false), 5000);
  };

  if (items.length === 0 && !isFlushing) return null;
  if (!isOnline && items.length > 0) {
     return (
        <div className="fixed bottom-24 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 sm:left-auto sm:right-6 sm:w-80">
          <SectionCard className="border-white/10 bg-black/80 backdrop-blur-xl p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/40">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-white/40">Fila Offline</p>
                <p className="mt-1 text-sm font-medium text-white">{items.length} envio{items.length > 1 ? 's' : ''} guardado{items.length > 1 ? 's' : ''}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/50">Aguardando conexão para reenviar automaticamente.</p>
              </div>
            </div>
          </SectionCard>
        </div>
     );
  }

  if (isOnline && items.length > 0 && !isFlushing) {
    return (
      <div className="fixed bottom-24 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 sm:left-auto sm:right-6 sm:w-96">
        <SectionCard className="border-[color:var(--color-accent)]/30 bg-black/80 backdrop-blur-xl p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-accent)]/20 text-[color:var(--color-accent)]">
              <Zap className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--color-accent)]">Conexão Estabelecida</p>
                <Badge variant="accent" className="h-5 px-1.5 text-[9px]">{items.length} Pendente{items.length > 1 ? 's' : ''}</Badge>
              </div>
              <p className="mt-1 text-sm font-medium text-white">Você tem pendências locais</p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/50">Deseja reenviar agora para atualizar o mapa?</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button onClick={flushAll} className="h-9">
                  <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Enviar tudo
                </Button>
                <Button onClick={() => onReviewRequested?.(items[0])} variant="secondary" className="h-9">
                   Ver lista
                </Button>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  if (isFlushing) {
    return (
       <div className="fixed bottom-24 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 sm:left-auto sm:right-6 sm:w-96">
        <SectionCard className="border-white/10 bg-black/90 backdrop-blur-xl p-5 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            {progress.current < progress.total ? (
              <RefreshCcw className="mb-3 h-8 w-8 animate-spin text-[color:var(--color-accent)]" />
            ) : progress.fail > 0 ? (
               <AlertCircle className="mb-3 h-8 w-8 text-orange-400" />
            ) : (
               <CheckCircle2 className="mb-3 h-8 w-8 text-green-400" />
            )}
            
            <p className="text-sm font-bold uppercase tracking-widest text-white/40">Status do Reenvio</p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              {progress.current < progress.total ? `Enviando ${progress.current}/${progress.total}...` : 'Processamento concluído'}
            </h3>
            
            <div className="mt-4 flex w-full flex-col gap-2">
               <div className="flex justify-between text-xs text-white/40">
                  <span>Sucesso: {progress.success}</span>
                  <span>Falhas: {progress.fail}</span>
               </div>
               <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div 
                    className="h-full bg-[color:var(--color-accent)] transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
               </div>
            </div>

            {progress.current >= progress.total && (
              <Button onClick={() => setIsFlushing(false)} variant="secondary" className="mt-6 w-full">
                Fechar
              </Button>
            )}
          </div>
        </SectionCard>
      </div>
    );
  }

  return null;
}
