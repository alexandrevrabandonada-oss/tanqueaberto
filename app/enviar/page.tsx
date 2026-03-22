import { Camera, Clock3, Fuel, MapPinned, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/ui/section-card";
import { stations } from "@/lib/mock-data";

export default function SubmitPage() {
  return (
    <AppShell>
      <SectionCard className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Fluxo colaborativo</p>
          <h2 className="mt-1 text-[1.8rem] font-semibold leading-none text-white">Enviar preco</h2>
        </div>
        <p className="text-sm text-white/62">
          A estrutura abaixo ja esta pronta para virar formulario real com upload no Supabase Storage e moderacao.
        </p>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="rounded-[22px] border border-dashed border-white/14 bg-black/30 p-4 text-sm text-white/62">
          <div className="flex items-center gap-3 text-white">
            <MapPinned className="h-5 w-5 text-[color:var(--color-accent)]" />
            1. Selecionar posto
          </div>
          <div className="mt-4 grid gap-2">
            {stations.map((station) => (
              <button
                key={station.id}
                type="button"
                className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-3 text-left text-sm"
              >
                {station.name}
                <span className="mt-1 block text-xs text-white/44">
                  {station.neighborhood}, {station.city}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px] border border-dashed border-white/14 bg-black/30 p-4">
            <div className="flex items-center gap-3 text-white">
              <Camera className="h-5 w-5 text-[color:var(--color-accent)]" />
              2. Tirar ou enviar foto
            </div>
            <p className="mt-3 text-sm text-white/56">Upload direto para bucket `price-report-photos`.</p>
          </div>
          <div className="rounded-[22px] border border-dashed border-white/14 bg-black/30 p-4">
            <div className="flex items-center gap-3 text-white">
              <Fuel className="h-5 w-5 text-[color:var(--color-accent)]" />
              3. Combustivel e preco
            </div>
            <p className="mt-3 text-sm text-white/56">Gasolina, etanol, diesel ou GNV.</p>
          </div>
          <div className="rounded-[22px] border border-dashed border-white/14 bg-black/30 p-4">
            <div className="flex items-center gap-3 text-white">
              <Clock3 className="h-5 w-5 text-[color:var(--color-accent)]" />
              4. Data e hora do envio
            </div>
            <p className="mt-3 text-sm text-white/56">Persistidas automaticamente no banco.</p>
          </div>
          <div className="rounded-[22px] border border-dashed border-white/14 bg-black/30 p-4">
            <div className="flex items-center gap-3 text-white">
              <ShieldCheck className="h-5 w-5 text-[color:var(--color-accent)]" />
              5. Moderacao
            </div>
            <p className="mt-3 text-sm text-white/56">Entrada vai para `pending` antes da publicacao.</p>
          </div>
        </div>
      </SectionCard>
    </AppShell>
  );
}
