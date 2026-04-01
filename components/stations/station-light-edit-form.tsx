import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import type { Station } from "@/lib/types";
import { getStationPublicName } from "@/lib/quality/stations";
import { updateStationLightEditAction } from "@/app/postos/[id]/editar/actions";
import type { TerritorialDuplicateCandidate } from "@/lib/ops/territorial-curation";

interface StationLightEditFormProps {
  station: Station;
  duplicateCandidates: TerritorialDuplicateCandidate[];
  notice?: string;
  error?: string;
  returnToHref?: string;
  duplicateMode?: boolean;
  initialDuplicateOfStationId?: string | null;
}

function getBanner(notice?: string, error?: string) {
  if (notice === "saved") return "Edição leve salva.";
  if (notice === "saved_review") return "Edição salva e marcada para revisão.";
  if (notice === "duplicate_linked") return "Vínculo de duplicado salvo.";
  if (error === "station_not_found") return "Posto não encontrado.";
  if (error === "missing_nickname") return "Informe o apelido do posto.";
  if (error === "invalid_duplicate") return "Escolha um duplicado diferente deste posto.";
  if (error === "save_failed") return "Não foi possível salvar agora.";
  if (error === "invalid_request") return "Pedido inválido.";
  return null;
}

export function StationLightEditForm({ station, duplicateCandidates, notice, error, returnToHref, duplicateMode = false, initialDuplicateOfStationId }: StationLightEditFormProps) {
  const banner = getBanner(notice, error);
  const publicName = getStationPublicName(station);
  const preferredDuplicateOfStationId = initialDuplicateOfStationId ?? station.duplicateOfStationId ?? duplicateCandidates[0]?.stationId ?? "";

  return (
    <SectionCard className="space-y-4 border-white/8 bg-black/25">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-xs uppercase tracking-[0.2em] text-white/42">Edição leve</p>
          <h2 className="text-2xl font-semibold text-white">Corrigir posto existente</h2>
          <p className="max-w-2xl text-sm text-white/58">Edite só o que ajuda a encontrar e reconhecer o posto. Mudança sensível vai para revisão.</p>
        </div>
        <Badge variant="outline">station_editor</Badge>
      </div>

      {duplicateMode ? (
        <div className="rounded-[18px] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
          Modo duplicidade ativo. Revise os parecidos, escolha o vinculo correto e salve com criterio.
        </div>
      ) : null}

      {banner ? <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/74">{banner}</div> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[18px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Posto</p>
          <p className="mt-2 text-lg font-semibold text-white">{publicName}</p>
          <p className="mt-1 text-sm text-white/54">{station.neighborhood} · {station.city}</p>
        </div>
        <div className="rounded-[18px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Geo</p>
          <p className="mt-2 text-lg font-semibold text-white">{station.geoReviewStatus ?? "pending"}</p>
          <p className="mt-1 text-sm text-white/54">{station.geoConfidence ?? "low"}</p>
        </div>
        <div className="rounded-[18px] border border-white/8 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Saída</p>
          <p className="mt-2 text-lg font-semibold text-white">{station.visibilityStatus ?? "review"}</p>
          <p className="mt-1 text-sm text-white/54">Mudança sensível volta para revisão.</p>
        </div>
      </div>

      <form action={updateStationLightEditAction} className="space-y-4">
        <input type="hidden" name="stationId" value={station.id} />
        {returnToHref ? <input type="hidden" name="returnTo" value={returnToHref} /> : null}

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-white/42">Apelido</span>
            <input name="nickname" defaultValue={station.namePublic ?? publicName} required className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30" placeholder="Nome curto do posto" />
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-white/42">Bandeira</span>
            <input name="brand" defaultValue={station.brand ?? ""} className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30" placeholder="Opcional" />
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-white/42">Rua / trecho</span>
            <input name="street" defaultValue={station.address ?? ""} className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30" placeholder="Trecho curto" />
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-white/42">Bairro</span>
            <input name="neighborhood" defaultValue={station.neighborhood ?? ""} className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30" placeholder="Opcional" />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-white/42">Latitude</span>
            <input name="lat" defaultValue={station.lat} inputMode="decimal" className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30" placeholder="-22.50000" />
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-white/42">Longitude</span>
            <input name="lng" defaultValue={station.lng} inputMode="decimal" className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30" placeholder="-44.10000" />
          </label>
        </div>

        <div className="space-y-3 rounded-[22px] border border-white/8 bg-black/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/42">Duplicidade</p>
              <h3 className="mt-1 text-base font-semibold text-white">Marcar posto parecido</h3>
              <p className="mt-1 text-sm text-white/54">Se for o mesmo lugar, vincule antes de salvar para evitar outro duplicado.</p>
            </div>
            <Badge variant={duplicateCandidates.length > 0 ? "warning" : "outline"}>{duplicateCandidates.length} parecidos</Badge>
          </div>

          {duplicateCandidates.length > 0 ? (
            <div className="space-y-2">
              {duplicateCandidates.map((candidate) => (
                <div key={candidate.stationId} className="rounded-[18px] border border-white/8 bg-white/5 px-3 py-3 text-sm text-white/68">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{candidate.publicName}</p>
                      <p className="text-[11px] text-white/42">{candidate.neighborhood || "Sem bairro"} · {candidate.city}</p>
                      <p className="mt-1 text-[11px] text-white/50">{candidate.reason}</p>
                    </div>
                    <Badge variant="outline">{candidate.score}</Badge>
                  </div>
                </div>
              ))}
              <label className="space-y-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/42">Vincular duplicado</span>
                <select
                  name="duplicateOfStationId"
                  defaultValue={preferredDuplicateOfStationId}
                  className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none"
                >
                  <option value="">Não vincular</option>
                  {duplicateCandidates.map((candidate) => (
                    <option key={candidate.stationId} value={candidate.stationId}>
                      {candidate.publicName} · {candidate.neighborhood || candidate.city}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <div className="rounded-[18px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/58">Nada muito parecido apareceu agora. Ainda assim, confira nome, rua e bairro antes de salvar.</div>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" className="w-full sm:flex-1">Salvar edição leve</Button>
          <Button type="reset" variant="secondary" className="w-full sm:flex-1">Limpar mudanças</Button>
        </div>
      </form>
    </SectionCard>
  );
}

