"use client";

import { type Route } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { trackProductEvent } from "@/lib/telemetry/client";

type GlobalSubmitCtaPlacement = "shell" | "dock";

interface GlobalSubmitCtaProps {
  placement: GlobalSubmitCtaPlacement;
  href?: Route;
  className?: string;
  label: string;
  note?: string;
}

export function GlobalSubmitCta({
  placement,
  href = "/enviar",
  className,
  label,
  note
}: GlobalSubmitCtaProps) {
  if (placement === "dock") {
    return null;
  }

  const handleClick = () => {
    void trackProductEvent({
      eventType: "fab_clicked" as any,
      pagePath: window.location.pathname,
      payload: {
        variant: placement,
        label,
        viewport: typeof window !== "undefined" ? (window.innerWidth >= 1024 ? "desktop" : window.innerWidth >= 768 ? "tablet" : "mobile") : "unknown"
      }
    });
  };

  return (
    <div
      data-global-cta="shell"
      data-global-cta-placement={placement}
      data-global-cta-href={href}
      data-global-cta-label={label}
      className={cn("hidden md:block", className)}
    >
      <div className="flex items-center justify-between gap-3 rounded-[22px] border border-[color:var(--color-accent)]/16 bg-black/28 px-3 py-2.5 backdrop-blur-md">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]/72">Ação contextual</p>
          <p className="max-w-2xl text-xs text-white/58">{note ?? "CTA governado pela rota atual."}</p>
        </div>
        <Link
          href={href}
          onClick={handleClick}
          className={cn(
            "inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[color:var(--color-accent)]/18 bg-[color:var(--color-accent)] px-4 py-2 text-sm font-semibold text-black shadow-[0_14px_32px_rgba(255,212,0,0.18)] transition active:scale-[0.99] hover:brightness-95",
            className
          )}
        >
          <Plus className="h-4 w-4" />
          <span className="truncate">{label}</span>
        </Link>
      </div>
    </div>
  );
}
