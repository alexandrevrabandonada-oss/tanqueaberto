"use client";

import { Badge } from "@/components/ui/badge";

interface PriceSubmitReviewProps {
  stationName: string;
  stationNeighborhood: string;
  stationAddress: string;
  fuelLabel: string;
  price: string;
}

export function PriceSubmitReview({ stationName, stationNeighborhood, stationAddress, fuelLabel, price }: PriceSubmitReviewProps) {
  return (
    <div className="rounded-[22px] border border-[color:var(--color-accent)]/18 bg-[color:var(--color-accent)]/8 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-accent)]/72">Revisão final</p>
        <Badge variant="warning">Entrará em revisão</Badge>
      </div>
      <p className="mt-2 text-sm font-semibold text-white">Confirme antes de enviar.</p>
      <div className="mt-4 space-y-2 text-sm text-white/72">
        <div className="flex items-center justify-between gap-3 rounded-[16px] border border-white/8 bg-black/20 px-3 py-2">
          <span className="text-white/48">Posto</span>
          <span className="truncate text-right font-medium text-white">{stationName}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-[16px] border border-white/8 bg-black/20 px-3 py-2">
          <span className="text-white/48">Endereço</span>
          <span className="truncate text-right font-medium text-white">{stationNeighborhood || stationAddress || "Localização aproximada"}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-[16px] border border-white/8 bg-black/20 px-3 py-2">
          <span className="text-white/48">Combustível</span>
          <span className="truncate text-right font-medium text-white">{fuelLabel}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-[16px] border border-white/8 bg-black/20 px-3 py-2">
          <span className="text-white/48">Preço</span>
          <span className="truncate text-right font-medium text-white">{price}</span>
        </div>
      </div>
      <p className="mt-3 text-xs text-white/58">Quando você tocar em enviar, o preço entra em revisão.</p>
    </div>
  );
}
