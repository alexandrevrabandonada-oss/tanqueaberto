"use client";

import { useState } from "react";
import { Copy, MessageCircle, Download } from "lucide-react";
import type { Route } from "next";

import { Button, ButtonLink } from "@/components/ui/button";

interface WeeklyPostsPautaActionsProps {
  copyText: string;
  csvHref: Route;
}

export function WeeklyPostsPautaActions({ copyText, csvHref }: WeeklyPostsPautaActionsProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function handleWhatsApp() {
    const text = encodeURIComponent(copyText);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" onClick={() => void handleCopy()}>
        <Copy className="h-4 w-4" />
        {copied ? "Pauta copiada" : "Copiar pauta"}
      </Button>
      <Button type="button" variant="ghost" onClick={handleWhatsApp}>
        <MessageCircle className="h-4 w-4" />
        WhatsApp
      </Button>
      <ButtonLink href={csvHref} variant="ghost">
        <Download className="h-4 w-4" />
        CSV simples
      </ButtonLink>
    </div>
  );
}
