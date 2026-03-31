# Estado da Nação: operação da primeira semana pública

## Resumo executivo

A primeira semana pública do Bomba Aberta deve ser operada com leitura curta e repetível, usando o que já existe em telemetry, export operacional, aprovação e fila.

O conjunto já disponível basta para o plantão:
- `launch-funnel`
- `launch-surface`
- `launch-errors`
- `launch-queue`
- `launch-drafts`
- `launch-approval`
- `launch-identity`

## Perguntas operacionais

| Pergunta | Sinais | Leitura |
| --- | --- | --- |
| O usuário está entrando e entendendo o produto? | `home_opened`, `home_search_used`, `station_clicked` | Se `home_opened` e alto e `home_search_used` e baixo, a home nao esta explicando valor. |
| O usuário está encontrando posto? | `station_clicked`, conversao em `/postos/[id]` | Se `station_clicked` sobe e `submit_opened` nao acompanha, o posto virou leitura. |
| O usuário está começando envio? | `submit_opened`, `submission_started` | Se `submit_opened` e alto e `submission_started` e baixo, o atrito esta no formulario. |
| O usuário está ficando preso em foto, rede ou fila? | `submission_queue_added`, `submission_queue_completed`, `submission_draft_restored` | Se fila cresce e completude cai, a dor e tecnica ou abandono. |
| A moderação está acompanhando o volume? | `pending`, `avgMinutes`, `medianMinutes`, `p90Minutes` | Se a fila cresce e a aprovacao demora, o backlog virou risco. |
| A identidade leve está entrando cedo demais ou na hora certa? | `identity_prompt_shown`, `identity_prompt_saved`, `identity_prompt_dismissed` | Se muita gente ve e pouca gente salva, o convite esta cedo demais. |

## Thresholds de atenção

- Atenção se `home_search_used` ficar abaixo de 35% de `home_opened`.
- Atenção se `station_clicked` ficar abaixo de 25% de `home_opened`.
- Atenção se `submit_opened` ficar abaixo de 50% de `station_clicked`.
- Atenção se `submission_started` ficar abaixo de 70% de `submit_opened`.
- Atenção se `queue_added` for maior que `queue_completed` por mais de 1.5x.
- Atenção se `completion_rate` cair abaixo de 65%.
- Atenção se `discard_rate` subir acima de 15%.
- Atenção se `pending` passar de 20 e o mais antigo estiver acima de 4 horas.
- Atenção se `median_minutes` passar de 60 minutos.
- Atenção se `p90_minutes` passar de 180 minutos.
- Atenção se `identity_prompt_shown` passar de 15% do volume de `submit_opened` + `hub_opened` e `save_rate` ficar abaixo de 20%.
- Atenção se `dismiss_rate` ficar acima de 60%.

## Leituras e CSVs

### Endpoint
- `/api/admin/ops/export`

### CSVs principais
- `launch-funnel`
- `launch-surface`
- `launch-errors`
- `launch-queue`
- `launch-drafts`
- `launch-approval`
- `launch-identity`

### CSVs de contexto
- `events`
- `funnel`
- `ops`
- `invites`
- `readiness`
- `gaps`
- `feedback`

## Runbook curto de plantão

1. Abrir `launch-funnel` e `launch-surface`.
2. Abrir `launch-errors` se houver queda de conversao.
3. Abrir `launch-queue` e `launch-drafts` se houver abandono.
4. Abrir `launch-approval` se a fila de moderacao subir.
5. Abrir `launch-identity` se o convite leve estiver sendo exibido demais.
6. Registrar a causa dominante do dia e a acao tomada.

## Respostas rapidas

- O usuário está entrando e entendendo o produto: olhar `home_opened` -> `home_search_used` -> `station_clicked`.
- O usuário está encontrando posto: olhar conversao da superfície `/postos/[id]`.
- O usuário está começando envio: olhar `submit_opened` -> `submission_started`.
- O usuário está preso em foto/rede/fila: olhar `launch-queue`, `launch-drafts` e `launch-errors`.
- A moderação está acompanhando: olhar `launch-approval`.
- A identidade leve está entrando cedo: olhar `launch-identity`.

## Validação

Executado nesta passada:
- `npm run typecheck`
- `npm run build`
- `npm run verify`

## Dif focado

Nao houve mudança de layout publico nesta passada.

Arquivos usados na leitura operacional:
- [lib/ops/launch-observability.ts](C:/Projetos/Tanque%20Aberto/lib/ops/launch-observability.ts)
- [app/admin/ops/export/route.ts](C:/Projetos/Tanque%20Aberto/app/admin/ops/export/route.ts)
- [components/admin/fast-approval-queue.tsx](C:/Projetos/Tanque%20Aberto/components/admin/fast-approval-queue.tsx)
- [components/admin/ops/beta-ops-signals.tsx](C:/Projetos/Tanque%20Aberto/components/admin/ops/beta-ops-signals.tsx)
- [components/admin/ops/ops-metric-card.tsx](C:/Projetos/Tanque%20Aberto/components/admin/ops/ops-metric-card.tsx)
