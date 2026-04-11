import Image from "next/image";

import { BrandMark } from "@/components/brand/brand-mark";

export function PwaSplash() {
  return (
    <div className="relative grid min-h-[100svh] place-items-center overflow-hidden px-6">
      <div className="w-full max-w-[380px] space-y-5 rounded-[34px] border border-white/8 bg-black/50 p-7 text-center shadow-[0_28px_80px_rgba(0,0,0,0.46)] backdrop-blur-md">
        <div className="mx-auto flex min-h-40 items-center justify-center rounded-[34px] border border-white/8 bg-black/35 px-4 py-5 shadow-[0_0_0_14px_rgba(255,199,0,0.06)]">
          <BrandMark variant="emblem" className="h-auto w-full max-w-[300px]" decorative />
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-white/42">VR Abandonada</p>
          <h1 className="font-display text-2xl leading-none text-white">Bomba Aberta</h1>
          <p className="text-sm text-white/58">Mapa popular dos postos no Sul Fluminense.</p>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-8 flex justify-center px-6">
        <div className="flex items-center gap-3 rounded-full border border-[#ffb340]/18 bg-black/45 px-4 py-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.28)] backdrop-blur-md">
          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-[#ffb340]/24 bg-black/80">
            <Image
              src="/brand/vrabandonadalogo.jpeg"
              alt="VR Abandonada"
              fill
              sizes="44px"
              className="object-cover"
              priority
            />
          </span>
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/54">
            parte do movimento <span className="font-black text-[#ffd54a]">VR Abandonada</span>
          </p>
        </div>
      </div>
    </div>
  );
}
