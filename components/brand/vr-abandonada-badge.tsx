"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";

const VR_ABANDONADA_URL = "https://www.instagram.com/vr_abandonada/";
const VR_ABANDONADA_LOGO = "/brand/vrabandonadalogo.jpeg";

interface VrAbandonadaBadgeProps {
  compact?: boolean;
  className?: string;
}

function VrAbandonadaMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", compact && "gap-2")}>
      <span
        aria-hidden="true"
        className={cn(
          "relative flex h-11 w-11 shrink-0 overflow-hidden rounded-[14px] border border-[#ffb340]/22 bg-black/80 shadow-[0_10px_28px_rgba(255,162,0,0.18)]",
          compact && "h-9 w-9 rounded-[12px]"
        )}
      >
        <Image
          src={VR_ABANDONADA_LOGO}
          alt=""
          fill
          sizes={compact ? "36px" : "44px"}
          className="object-cover"
        />
      </span>

      <span className="min-w-0 leading-none">
        <span className={cn("block truncate text-[9px] font-black uppercase tracking-[0.22em] text-white/42", compact && "text-[8px] tracking-[0.18em]")}>
          Movimento
        </span>
        <span className={cn("mt-1 block truncate text-sm font-black uppercase tracking-[0.04em] text-[#ffd54a]", compact && "text-[12px]")}>
          VR Abandonada
        </span>
      </span>
    </span>
  );
}

export function VrAbandonadaBadge({ compact = false, className }: VrAbandonadaBadgeProps) {
  return (
    <Link
      href={VR_ABANDONADA_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Abrir perfil da VR Abandonada no Instagram"
      className={cn(
        "group inline-flex items-center justify-between gap-3 rounded-[22px] border border-[#ffb340]/18 bg-[linear-gradient(180deg,rgba(255,176,55,0.09),rgba(255,255,255,0.02))] px-3 py-2 text-left text-white/74 shadow-[0_14px_34px_rgba(0,0,0,0.22)] transition hover:border-[#ffd54a]/36 hover:bg-[linear-gradient(180deg,rgba(255,176,55,0.14),rgba(255,255,255,0.03))]",
        compact && "rounded-[18px] px-2.5 py-2",
        className
      )}
    >
      <VrAbandonadaMark compact={compact} />
      <ExternalLink className={cn("h-3.5 w-3.5 shrink-0 text-white/30 transition group-hover:text-[#ffd54a]", compact && "h-3 w-3")} />
    </Link>
  );
}
