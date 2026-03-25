"use client";

import type { Route } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackProductEvent } from "@/lib/telemetry/client";
import { useMissionContext } from "@/components/mission/mission-context";

interface FabProps {
  href?: Route;
  label?: string;
  className?: string;
  variant?: "floating" | "anchored" | "integrated";
}

export function Fab({ 
  href = "/enviar", 
  label = "Enviar preço", 
  className,
  variant = "floating" 
}: FabProps) {
  const { mission } = useMissionContext();
  
  // Hide global floating/anchored FAB when in mission to favor mission-specific CTAs
  if (mission && (variant === "floating" || variant === "anchored")) {
    return null;
  }

  const handleClick = () => {
    void trackProductEvent({
      eventType: "fab_clicked" as any,
      pagePath: window.location.pathname,
      payload: { 
        variant, 
        label,
        viewport: typeof window !== "undefined" ? (window.innerWidth >= 1024 ? "desktop" : window.innerWidth >= 768 ? "tablet" : "mobile") : "unknown"
      }
    });
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        "z-30 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)] px-4 py-3 text-sm font-semibold text-black shadow-[0_18px_45px_rgba(255,212,0,0.22)] transition-all duration-300 active:scale-95",
        // Position variant logic
        variant === "floating" && "fixed bottom-24 right-4 sm:bottom-28 sm:right-8",
        variant === "anchored" && "fixed bottom-24 lg:bottom-28 left-[calc(50%+240px)] md:left-[calc(50%+300px)] lg:left-[calc(50%+380px)] -translate-x-1/2 hover:scale-105 active:scale-95",
        variant === "integrated" && "relative shadow-none",
        className
      )}
    >
      <Plus className="h-4 w-4" />
      {label}
    </Link>
  );
}
