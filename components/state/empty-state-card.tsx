import type { Route } from "next";

import { BrandMark } from "@/components/brand/brand-mark";
import { ButtonLink } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/utils";

interface EmptyStateCardProps {
  title: string;
  description: string;
  actionHref?: Route;
  actionLabel?: string;
  className?: string;
}

export function EmptyStateCard({ title, description, actionHref, actionLabel, className }: EmptyStateCardProps) {
  return (
    <SectionCard className={cn("space-y-4 text-center", className)}>
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/8 bg-black/30 shadow-[0_0_0_8px_rgba(255,199,0,0.06)]">
        <BrandMark variant="symbol" className="h-10 w-10" decorative />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-white/58">{description}</p>
      </div>
      {actionHref && actionLabel ? (
        <ButtonLink href={actionHref} className="w-full">
          {actionLabel}
        </ButtonLink>
      ) : null}
    </SectionCard>
  );
}
