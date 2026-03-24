"use client";

import { useState } from "react";
import { X, Send, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ContextualFeedbackProps {
  title: string;
  placeholder?: string;
  onSelect: (message: string, tags: string[]) => void;
  onCancel: () => void;
  autoTags?: string[];
}

export function ContextualFeedback({ 
  title, 
  placeholder = "Conte-nos o motivo (opcional)...", 
  onSelect, 
  onCancel,
  autoTags = []
}: ContextualFeedbackProps) {
  const [message, setMessage] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const commonTags = [
    { id: "ux_confusa", label: "UX Confusa" },
    { id: "posto_ambiguo", label: "Posto Ambíguo" },
    { id: "longe", label: "Muito Longe" },
    { id: "fechado", label: "Posto Fechado" },
    { id: "erro_gps", label: "Erro no GPS" },
  ];

  const handleSend = () => {
    onSelect(message, [...selectedTags, ...autoTags]);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300 rounded-3xl bg-[#111] border border-white/10 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-white/50">{title}</h3>
          <button onClick={onCancel} className="text-white/20 hover:text-white/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {commonTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => setSelectedTags(prev => 
                  prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id]
                )}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tight transition-all",
                  selectedTags.includes(tag.id) 
                    ? "bg-[color:var(--color-accent)] text-black" 
                    : "bg-white/5 text-white/40 border border-white/5 hover:bg-white/10"
                )}
              >
                {tag.label}
              </button>
            ))}
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            className="w-full h-24 bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[color:var(--color-accent)]/50 transition-colors resize-none"
          />

          <Button 
            onClick={handleSend}
            className="w-full h-12 rounded-full font-bold bg-white text-black hover:bg-white/90"
          >
            <Send className="w-4 h-4 mr-2" />
            Enviar Feedback
          </Button>
          
          <p className="text-[10px] text-center text-white/20">
            Seu feedback ajuda a melhorar o recorte para todos.
          </p>
        </div>
      </div>
    </div>
  );
}
