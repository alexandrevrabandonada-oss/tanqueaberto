"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import type { Station } from "@/lib/types";
import { getStationPublicName } from "@/lib/quality/stations";
import { mergeStationIntoCanonicalAction, updateStationLightEditAction } from "@/app/postos/[id]/editar/actions";
import type { TerritorialDuplicateCandidate } from "@/lib/ops/territorial-curation";

interface CanonicalMergeOption {
  stationId: string;
  publicName: string;
  city: string;
  neighborhood: string;
  address: string;
  brand: string;
}

interface StationLightEditFormProps {
  station: Station;
  duplicateCandidates: TerritorialDuplicateCandidate[];
  canonicalMergeOptions: CanonicalMergeOption[];
  notice?: string;
  error?: string;
  returnToHref?: string;
  duplicateMode?: boolean;
  initialDuplicateOfStationId?: string | null;
  canAdminMerge?: boolean;
}

function getBanner(notice?: string, error?: string) {
  if (notice === "saved") return "Edição leve salva.";
  if (notice === "saved_review") return "Edição salva e marcada para revisão.";
  if (notice === "duplicate_linked") return "Vínculo de duplicado salvo.";
  if (notice === "stations_merged") return "Postos unificados. O posto canônico já está com o nome final escolhido.";
  if (error === "station_not_found") return "Posto não encontrado.";
  if (error === "missing_nickname") return "Informe o apelido do posto.";
  if (error === "invalid_duplicate") return "Escolha um duplicado diferente deste posto.";
  if (error === "merge_requires_duplicate") return "Escolha o posto que deve sobreviver para unificar.";
  if (error === "missing_canonical_name") return "Informe o nome final do posto canônico.";
  if (error === "merge_target_not_found") return "O posto canônico escolhido não foi encontrado.";
  if (error === "merge_failed") return "Não foi possível unificar estes postos agora.";
  if (error === "save_failed") return "Não foi possível salvar agora.";
  if (error === "invalid_request") return "Pedido inválido.";
  return null;
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function StationLightEditForm({ station, duplicateCandidates, canonicalMergeOptions, notice, error, returnToHref, duplicateMode = false, initialDuplicateOfStationId, canAdminMerge = false }: StationLightEditFormProps) {
  const banner = getBanner(notice, error);
  const publicName = getStationPublicName(station);
  const preferredDuplicateOfStationId = initialDuplicateOfStationId ?? station.duplicateOfStationId ?? duplicateCandidates[0]?.stationId ?? "";
  const canonicalNameDefault = duplicateCandidates.find((candidate) => candidate.stationId === preferredDuplicateOfStationId)?.publicName ?? canonicalMergeOptions.find((candidate) => candidate.stationId === preferredDuplicateOfStationId)?.publicName ?? publicName;
  const [selectedDuplicateOfStationId, setSelectedDuplicateOfStationId] = useState(preferredDuplicateOfStationId);
  const [selectedMergeTargetStationId, setSelectedMergeTargetStationId] = useState(preferredDuplicateOfStationId);
  const [canonicalName, setCanonicalName] = useState(canonicalNameDefault);
  const [mergeConfirmationText, setMergeConfirmationText] = useState("");
  const [mergeSearchQuery, setMergeSearchQuery] = useState("");
  const selectedDuplicateCandidate = duplicateCandidates.find((candidate) => candidate.stationId === selectedDuplicateOfStationId) ?? null;
  const selectedMergeTarget = canonicalMergeOptions.find((candidate) => candidate.stationId === selectedMergeTargetStationId) ?? null;
  const canonicalNamePreview = canonicalName.trim();
  const confirmationPhrase = "UNIFICAR";
  const canSubmitMerge = Boolean(
    selectedMergeTarget
      && canonicalNamePreview.length > 0
      && mergeConfirmationText.trim().toUpperCase() === confirmationPhrase
  );
  const normalizedMergeSearchQuery = normalizeSearchValue(mergeSearchQuery);
  const filteredMergeOptions = canonicalMergeOptions.filter((candidate) => {
    if (!normalizedMergeSearchQuery) {
      return candidate.city === station.city || candidate.stationId === selectedMergeTargetStationId;
    }

    const searchable = normalizeSearchValue([candidate.publicName, candidate.brand, candidate.address, candidate.neighborhood, candidate.city].join(" "));
    return searchable.includes(normalizedMergeSearchQuery);
  }).slice(0, normalizedMergeSearchQuery ? 12 : 8);

  function handleDuplicateSelection(nextDuplicateOfStationId: string) {
    const currentSelectedName = selectedDuplicateCandidate?.publicName ?? publicName;
    const nextSelectedCandidate = duplicateCandidates.find((candidate) => candidate.stationId === nextDuplicateOfStationId) ?? null;
    setSelectedDuplicateOfStationId(nextDuplicateOfStationId);

    if (!canonicalNamePreview || canonicalNamePreview === currentSelectedName || canonicalNamePreview === publicName) {
      setCanonicalName(nextSelectedCandidate?.publicName ?? publicName);
    }
  }

  function handleMergeTargetSelection(nextMergeTargetStationId: string) {
    const currentSelectedName = selectedMergeTarget?.publicName ?? publicName;
    const nextSelectedTarget = canonicalMergeOptions.find((candidate) => candidate.stationId === nextMergeTargetStationId) ?? null;
    setSelectedMergeTargetStationId(nextMergeTargetStationId);

    if (!canonicalNamePreview || canonicalNamePreview === currentSelectedName || canonicalNamePreview === publicName) {
      setCanonicalName(nextSelectedTarget?.publicName ?? publicName);
    }
  }

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

      <form
        action={updateStationLightEditAction}
        className="space-y-4"
        onReset={() => {
          setSelectedDuplicateOfStationId(preferredDuplicateOfStationId);
          setSelectedMergeTargetStationId(preferredDuplicateOfStationId);
          setCanonicalName(canonicalNameDefault);
          setMergeConfirmationText("");
          setMergeSearchQuery("");
        }}
      >
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
                  value={selectedDuplicateOfStationId}
                  onChange={(event) => handleDuplicateSelection(event.target.value)}
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

        {canAdminMerge && canonicalMergeOptions.length > 0 ? (
          <div className="space-y-3 rounded-[22px] border border-amber-400/18 bg-amber-400/8 p-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.18em] text-amber-100/68">Unificação canônica</p>
              <h3 className="text-base font-semibold text-white">Fazer sobreviver um posto só</h3>
              <p className="text-sm text-white/58">Esse fluxo move os reports do posto atual para o posto escolhido, esconde o duplicado e define o nome público final do sobrevivente.</p>
            </div>

            <input type="hidden" name="mergeTargetStationId" value={selectedMergeTargetStationId} />

            <label className="space-y-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/42">Buscar posto canônico</span>
              <input
                value={mergeSearchQuery}
                onChange={(event) => setMergeSearchQuery(event.target.value)}
                className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30"
                placeholder="Busque por nome, rua, bairro, cidade ou bandeira"
              />
            </label>

            <div className="space-y-2 rounded-[18px] border border-white/8 bg-black/25 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/42">Escolher posto que vai sobreviver</p>
              {filteredMergeOptions.length > 0 ? (
                <div className="space-y-2">
                  {filteredMergeOptions.map((candidate) => {
                    const isSelected = candidate.stationId === selectedMergeTargetStationId;
                    return (
                      <button
                        key={candidate.stationId}
                        type="button"
                        onClick={() => handleMergeTargetSelection(candidate.stationId)}
                        className={`w-full rounded-[16px] border px-3 py-3 text-left transition ${isSelected ? "border-amber-300/40 bg-amber-400/14 text-white" : "border-white/8 bg-white/5 text-white/72 hover:bg-white/10"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{candidate.publicName}</p>
                            <p className="mt-1 text-[11px] text-white/50">{candidate.neighborhood || "Sem bairro"} · {candidate.city}</p>
                            <p className="mt-1 truncate text-[11px] text-white/44">{candidate.brand ? `${candidate.brand} · ` : ""}{candidate.address || "Sem endereço útil"}</p>
                          </div>
                          {isSelected ? <Badge variant="warning">canônico</Badge> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[16px] border border-white/8 bg-white/5 px-3 py-3 text-sm text-white/58">Nenhum posto ativo bateu com essa busca.</div>
              )}
            </div>

            <label className="space-y-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/42">Nome público final</span>
              <input
                name="canonicalName"
                value={canonicalName}
                onChange={(event) => setCanonicalName(event.target.value)}
                className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30"
                placeholder="Ex.: Posto Rua 4 Conforto"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[18px] border border-emerald-400/16 bg-emerald-400/8 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-100/58">Vai sobreviver</p>
                <p className="mt-2 text-sm font-semibold text-white">{selectedMergeTarget?.publicName ?? "Escolha um posto canônico"}</p>
                <p className="mt-1 text-[11px] text-white/50">{selectedMergeTarget ? `${selectedMergeTarget.neighborhood || "Sem bairro"} · ${selectedMergeTarget.city}` : "O posto escolhido receberá os reports aproveitados."}</p>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-black/25 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/36">Vai sair de circulação</p>
                <p className="mt-2 text-sm font-semibold text-white">{publicName}</p>
                <p className="mt-1 text-[11px] text-white/50">Este posto será ocultado como duplicado e deixará de ser o ponto principal.</p>
              </div>
              <div className="rounded-[18px] border border-amber-400/16 bg-amber-400/8 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-amber-100/58">Nome final aplicado</p>
                <p className="mt-2 text-sm font-semibold text-white">{canonicalNamePreview || "Informe o nome público final"}</p>
                <p className="mt-1 text-[11px] text-white/50">Use o nome que faz mais sentido para o posto canônico, mesmo que os dois estejam genéricos.</p>
              </div>
            </div>

            <div className="rounded-[18px] border border-white/8 bg-black/25 px-4 py-3 text-sm text-white/60">
              Ação esperada: os reports do posto atual migram para o posto canônico, o canônico assume o nome final acima e o posto atual fica oculto como duplicado.
            </div>

            <label className="space-y-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/42">Confirmação manual</span>
              <input
                name="mergeConfirmation"
                value={mergeConfirmationText}
                onChange={(event) => setMergeConfirmationText(event.target.value)}
                className="w-full rounded-[16px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30"
                placeholder={`Digite ${confirmationPhrase} para liberar a unificação`}
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-[11px] text-white/46">Digite {confirmationPhrase} exatamente para confirmar que o posto atual será absorvido pelo canônico.</p>
            </label>

            <Button type="submit" formAction={mergeStationIntoCanonicalAction} variant="accent" className="w-full sm:w-auto" disabled={!canSubmitMerge}>
              Unificar postos e aplicar nome final
            </Button>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" className="w-full sm:flex-1">Salvar edição leve</Button>
          <Button type="reset" variant="secondary" className="w-full sm:flex-1">Limpar mudanças</Button>
        </div>
      </form>
    </SectionCard>
  );
}

