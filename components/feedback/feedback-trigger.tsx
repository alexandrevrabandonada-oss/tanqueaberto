"use client";

import Link from "next/link";
import { MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Route } from "next";

interface FeedbackTriggerProps {
  className?: string;
  stationId?: string;
  city?: string;
  fuelType?: string;
  context?: string;
  title?: string;
}

export function FeedbackTrigger({ className, stationId, city, fuelType, context, title }: FeedbackTriggerProps) {
  const params = new URLSearchParams();
  params.set("from", typeof window !== "undefined" ? window.location.pathname : "/");
  if (title) params.set("title", title);
  if (stationId) params.set("stationId", stationId);
  if (city) params.set("city", city);
  if (fuelType) params.set("fuelType", fuelType);
  if (context) params.set("context", context);

  const href = `/feedback?${params.toString()}` as Route;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/50 transition hover:bg-white/10 hover:text-white",
        className
      )}
    >
      <MessageSquarePlus className="h-3 w-3" />
      <span>Feedback</span>
    </Link>
  );
}
