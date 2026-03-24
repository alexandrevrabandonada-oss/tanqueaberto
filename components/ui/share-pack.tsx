"use client";

import { Share2, Link as LinkIcon, MessageCircle } from "lucide-react";
import { useState } from "react";
import { trackProductEvent } from "@/lib/telemetry/client";
import { cn } from "@/lib/utils";

interface SharePackProps {
  type: "city" | "group" | "station";
  id: string;
  name: string;
  slug?: string;
  className?: string;
}

export function SharePack({ type, id, name, slug, className }: SharePackProps) {
  const [copied, setCopied] = useState(false);

  const getUrl = () => {
    if (typeof window === "undefined") return "";
    const baseUrl = window.location.origin;
    const ref = `ref=share_${type}`;
    
    if (type === "station") return `${baseUrl}/postos/${id}?${ref}`;
    if (type === "city" && slug) return `${baseUrl}/cidade/${slug}?${ref}`;
    if (type === "group" && slug) return `${baseUrl}/grupo/${slug}?${ref}`;
    
    return `${window.location.href}${window.location.search ? "&" : "?"}${ref}`;
  };

  const getMessage = () => {
    if (type === "station") return `Confira o preço de hoje no posto ${name} no Bomba Aberta:`;
    if (type === "city") return `Veja como está a cobertura de preços em ${name} no Bomba Aberta:`;
    if (type === "group") return `Acompanhe o corredor ${name} no Bomba Aberta:`;
    return `Confira o Bomba Aberta:`;
  };

  const shareUrl = getUrl();
  const message = getMessage();

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${message}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
    
    void trackProductEvent({
      eventType: "territorial_shared" as any,
      pagePath: window.location.pathname,
      scopeType: type,
      scopeId: id,
      payload: { method: "whatsapp", name }
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      void trackProductEvent({
        eventType: "territorial_shared" as any,
        pagePath: window.location.pathname,
        scopeType: type,
        scopeId: id,
        payload: { method: "copy", name }
      });
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <button
        onClick={handleWhatsApp}
        className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all active:scale-95"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="text-[10px] font-black uppercase tracking-widest">WhatsApp</span>
      </button>

      <button
        onClick={handleCopy}
        className={cn(
          "flex h-11 items-center justify-center gap-2 rounded-2xl border transition-all active:scale-95",
          copied 
            ? "bg-blue-500/20 border-blue-500/40 text-blue-300" 
            : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
        )}
      >
        {copied ? <Share2 className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
        <span className="text-[10px] font-black uppercase tracking-widest">
          {copied ? "Copiado!" : "Link"}
        </span>
      </button>
    </div>
  );
}
