# Estado da Nação: telemetria das bordas do envio

## Diagnóstico
A borda do envio tinha sinais demais no fluxo geral e sinais de menos na parte que realmente interessa para medir fricção: sugestão de posto, troca manual, reaproveitamento do último posto, geo e abandono no passo do posto.

Antes desta passada, a leitura operacional enxergava o envio mais como funil geral do que como conjunto de bordas mensuráveis.

## O que mudou
- `lib/telemetry/types.ts`: novos eventos normalizados para bordas do envio.
- `hooks/use-geolocation.ts`: a geolocalização passou a reportar `reliable`, `imprecise` e `unavailable` via `station_geo_state_reported`.
- `components/forms/price-submit-form.tsx`: telemetria do picker de posto agora mede sugestão exibida, aceita, trocada, reaproveitamento do último posto, escolha de posto parecido e abandono no passo do posto.
- `app/enviar/actions.ts`: a borda de posto novo agora registra `station_proposal_flow_opened`, `station_proposal_created` e o envio com/sem geo.
- `lib/ops/launch-observability.ts`: o relatório ganhou `submissionBorders` com contagens e taxas simples.
- `app/admin/ops/export/route.ts`: novo CSV `launch-borders` para leitura rápida.
- `app/admin/ops/qualidade/page.tsx`: bloco compacto de leitura com as bordas do envio.

## Eventos cobertos
- `station_suggestion_shown`
- `station_suggestion_accepted`
- `station_suggestion_changed`
- `station_last_used_reused`
- `station_geo_state_reported`
- `station_similar_choice_clicked`
- `submission_station_step_abandoned`
- `station_proposal_flow_opened`
- `station_proposal_created`
- `station_proposal_submitted_with_geo`
- `station_proposal_submitted_without_geo`

## Antes / Depois
- Antes: um sinal combinado de contexto/autofill e abandono genérico do envio.
- Depois: 11 eventos específicos para bordas do posto e da geolocalização, com leitura direta no admin.
- Antes: a moderação via posto novo não deixava claro o quanto vinha com geo, sem geo ou em ramo de proposta.
- Depois: a fila operacional consegue separar geo confiável, geo impreciso, geo indisponível, posto parecido e proposta nova.
- Antes: não havia uma saída simples para exportar essas bordas.
- Depois: o admin tem `launch-borders.csv` e um painel resumido em Qualidade.

## Leitura operacional
- `suggestions_shown` alto e `suggestions_accepted` baixo: sugestão fraca ou cedo demais.
- `suggestions_changed` alto: sugestão inicial não está confiável.
- `last_used_reused` alto com `geo_unavailable` alto: o último posto está pesando demais sem apoio de localização.
- `station_step_abandoned` alto: a fricção continua no passo do posto.
- `proposal_submitted_without_geo` alto: o fluxo de posto novo está sendo usado, mas a revisão manual precisa acompanhar.

## Validação
- `npm run build` passou.
- `npm run typecheck` passou.
- `npm run verify` passou.

## Nota
Não houve mudança relevante no custo estrutural do app por causa desta passada. O foco foi medição e leitura operacional, não arquitetura ou UI.
