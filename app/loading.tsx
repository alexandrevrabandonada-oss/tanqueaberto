import { BrandMark } from "@/components/brand/brand-mark";

export default function Loading() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-[320px] space-y-5 rounded-[32px] border border-white/8 bg-black/40 p-6 text-center backdrop-blur-md">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/8 bg-black/35 shadow-[0_0_0_10px_rgba(255,199,0,0.06)]">
          <BrandMark variant="icon" className="h-12 w-12" decorative />
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-white/42">Bomba Aberta</p>
          <p className="text-lg font-semibold text-white">Carregando mapa vivo</p>
          <p className="text-sm text-white/58">Puxando postos, preços e recência.</p>
        </div>
      </div>
    </div>
  );
}
