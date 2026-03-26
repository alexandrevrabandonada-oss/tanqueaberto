"use client";

import { type Route } from "next";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { trackProductEvent } from "@/lib/telemetry/client";

type GlobalSubmitCtaPlacement = "shell" | "dock";

interface GlobalSubmitCtaProps {
  placement: GlobalSubmitCtaPlacement;
  href?: Route;
  className?: string;
  label?: string;
}

export function GlobalSubmitCta({
  placement,
  href = "/enviar",
  className,
  label = "Enviar preço agora"
}: GlobalSubmitCtaProps) {
  const pathname = usePathname();
  const isSubmitPage = pathname === "/enviar";

  if (isSubmitPage) {
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

  if (placement === "dock") {
    return (
      <div
        data-global-cta="dock"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[1010] px-4 md:hidden"
      >
        <div className="mx-auto w-full max-w-[560px] sm:max-w-[620px]">
          <Link
            href={href}
            onClick={handleClick}
            className={cn(
              "pointer-events-auto inline-flex w-full items-center justify-center gap-2 rounded-[22px] border border-[color:var(--color-accent)]/18 bg-[color:var(--color-accent)] px-4 py-3.5 text-sm font-semibold text-black shadow-[0_18px_45px_rgba(255,212,0,0.22)] transition active:scale-[0.99] hover:brightness-95",
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

  return (
    <div data-global-cta="shell" className={cn("hidden md:block", className)}>
      <div className="flex items-center justify-between gap-4 rounded-[28px] border border-white/8 bg-black/32 px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-md lg:px-5 lg:py-3.5">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] uppercase tracking-[0.24em] text-white/34">Acesso global</p>
          <p className="max-w-2xl text-sm text-white/58">CTA principal integrado ao shell, sem boiar na lateral e sem disputar espaço com o conteúdo.</p>
        </div>
        <Link
          href={href}
          onClick={handleClick}
          className={cn(
            "inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[color:var(--color-accent)]/18 bg-[color:var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-black shadow-[0_16px_35px_rgba(255,212,0,0.18)] transition active:scale-[0.99] hover:brightness-95 lg:h-11 lg:px-5",
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
