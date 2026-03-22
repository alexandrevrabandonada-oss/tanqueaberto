import { BrandMark } from "@/components/brand/brand-mark";

export function PwaSplash() {
  return (
    <div className="grid min-h-[100svh] place-items-center px-6">
      <div className="w-full max-w-[340px] space-y-5 rounded-[34px] border border-white/8 bg-black/50 p-7 text-center shadow-[0_28px_80px_rgba(0,0,0,0.46)] backdrop-blur-md">
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[34px] border border-white/8 bg-black/35 shadow-[0_0_0_14px_rgba(255,199,0,0.06)]">
          <BrandMark variant="symbol" className="h-16 w-16" decorative />
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-white/42">VR Abandonada</p>
          <h1 className="font-display text-2xl leading-none text-white">Bomba Aberta</h1>
          <p className="text-sm text-white/58">Mapa popular dos postos no Sul Fluminense.</p>
        </div>
      </div>
    </div>
  );
}
