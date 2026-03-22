import { Camera, Clock3, Fuel, MapPinned, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PriceSubmitForm } from "@/components/forms/price-submit-form";
import { SectionCard } from "@/components/ui/section-card";
import { getStationOptions } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const stations = await getStationOptions();

  return (
    <AppShell>
      <SectionCard className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Fluxo colaborativo</p>
          <h2 className="mt-1 text-[1.8rem] font-semibold leading-none text-white">Enviar preço</h2>
        </div>
        <p className="text-sm text-white/62">
          Envie uma foto, o combustível e o preço. O registro entra como aguardando moderação.
        </p>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px] border border-dashed border-white/14 bg-black/30 p-4">
            <div className="flex items-center gap-3 text-white">
              <MapPinned className="h-5 w-5 text-[color:var(--color-accent)]" />
              1. Selecionar posto
            </div>
            <p className="mt-3 text-sm text-white/56">Escolha o posto certo antes de enviar o preço.</p>
          </div>
          <div className="rounded-[22px] border border-dashed border-white/14 bg-black/30 p-4">
            <div className="flex items-center gap-3 text-white">
              <Camera className="h-5 w-5 text-[color:var(--color-accent)]" />
              2. Foto como evidência
            </div>
            <p className="mt-3 text-sm text-white/56">A foto vai junto com a atualização para validar o envio.</p>
          </div>
          <div className="rounded-[22px] border border-dashed border-white/14 bg-black/30 p-4">
            <div className="flex items-center gap-3 text-white">
              <Fuel className="h-5 w-5 text-[color:var(--color-accent)]" />
              3. Combustível e preço
            </div>
            <p className="mt-3 text-sm text-white/56">Gasolina, etanol, diesel ou GNV.</p>
          </div>
          <div className="rounded-[22px] border border-dashed border-white/14 bg-black/30 p-4">
            <div className="flex items-center gap-3 text-white">
              <Clock3 className="h-5 w-5 text-[color:var(--color-accent)]" />
              4. Horário automático
            </div>
            <p className="mt-3 text-sm text-white/56">O horário do envio é salvo automaticamente.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Formulário</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Dados do envio</h3>
        </div>
        <PriceSubmitForm stations={stations} />
        <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-white/58">
          <div className="flex items-center gap-2 text-white/80">
            <ShieldCheck className="h-4 w-4 text-[color:var(--color-accent)]" />
            Vai para moderação
          </div>
          <p className="mt-2">Depois do envio, o report entra com status de aguardando moderação.</p>
        </div>
      </SectionCard>
    </AppShell>
  );
}
