"use client";

import React from "react";
import { Bell, CheckCircle2, AlertCircle, Clock, ArrowRight, Inbox as InboxIcon, Trash2 } from "lucide-react";
import { formatRecencyLabel } from "@/lib/format/time";
import { useInbox, type InboxItem, type InboxEventType } from "@/hooks/use-inbox";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Route } from "next";
import { trackProductEvent } from "@/lib/telemetry/client";

interface CollectorInboxProps {
  className?: string;
  onItemClick?: () => void;
}

const iconMap: Record<InboxEventType, React.ReactNode> = {
  approved: <CheckCircle2 className="h-4 w-4 text-green-400" />,
  rejected: <AlertCircle className="h-4 w-4 text-red-400" />,
  audited: <Clock className="h-4 w-4 text-blue-400" />,
  queued: <Clock className="h-4 w-4 text-orange-400" />,
  needs_adjustment: <AlertCircle className="h-4 w-4 text-yellow-400" />,
  visible: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
};

export function CollectorInbox({ className, onItemClick }: CollectorInboxProps) {
  const { items, unreadCount, markAsRead, clearAll } = useInbox();
  const router = useRouter();

  if (items.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-center opacity-40", className)}>
        <InboxIcon className="h-10 w-10 mb-3 text-white/20" />
        <p className="text-xs font-bold uppercase tracking-widest text-white/40">Inbox Vazia</p>
        <p className="text-[10px] text-white/30 mt-1">Acompanhe aqui o retorno dos seus envios.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
            <Bell className={cn("h-4 w-4", unreadCount > 0 ? "text-[color:var(--color-accent)] animate-pulse" : "text-white/20")} />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Alertas de Coleta</h3>
            {unreadCount > 0 && (
                <span className="rounded-full bg-[color:var(--color-accent)] px-1.5 py-0.5 text-[8px] font-black text-black">
                    {unreadCount}
                </span>
            )}
        </div>
        <button 
          onClick={() => {
            if (confirm("Limpar todas as notificações?")) {
              clearAll();
              void trackProductEvent({ eventType: "inbox_cleared", pagePath: "/hub" });
            }
          }}
          className="text-[10px] font-bold text-white/20 hover:text-white/40 transition-colors flex items-center gap-1"
        >
          <Trash2 className="h-3 w-3" />
          Limpar
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div 
            key={item.id}
            onClick={() => {
              markAsRead(item.id);
              void trackProductEvent({ 
                eventType: "inbox_item_click", 
                pagePath: "/hub", 
                payload: { type: item.type, reportId: item.reportId } 
              });
              router.push(`/postos/${item.stationId}` as Route);
              onItemClick?.();
            }}
            className={cn(
              "group relative overflow-hidden rounded-[22px] border p-4 transition-all active:scale-[0.98] cursor-pointer",
              item.read 
                ? "bg-white/[0.02] border-white/5 opacity-60" 
                : "bg-white/[0.05] border-white/12 shadow-lg shadow-black/20"
            )}
          >
            {!item.read && (
                <div className="absolute right-4 top-4 h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)] shadow-[0_0_8px_rgba(255,199,0,0.5)]" />
            )}
            
            <div className="flex items-start gap-3">
              <div className={cn(
                "rounded-full p-2 bg-black/40 border border-white/5",
                !item.read && "border-[color:var(--color-accent)]/20"
              )}>
                {iconMap[item.type]}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{item.stationName}</p>
                  <span className="text-[9px] font-mono italic text-white/20">{formatRecencyLabel(item.timestamp)}</span>
                </div>
                <p className="text-xs font-bold leading-snug text-white/80 group-hover:text-white">
                  {item.message}
                </p>
                <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-bold uppercase text-[color:var(--color-accent)]">Ver detalhes</span>
                    <ArrowRight className="h-2.5 w-2.5 text-[color:var(--color-accent)]" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
