# Estado da Nacao - saneamento final de ops e auditoria

Data: 2026-03-28

## Resumo executivo

O runtime interno de ops e auditoria foi alinhado ao schema canonico real. O ruido recorrente vinha de uma combinacao de:

- queries legadas ainda lendo aliases antigos de tempo em `price_reports`
- migrations ja existentes no repositorio, mas com schema cache do ambiente real ainda apontando erro
- camadas internas que nao estavam tolerando fallback silencioso em superficies administrativas

O saneamento desta passada fechou o uso de `observed_at` e `submitted_at` em runtime, padronizou `price_reports` para `reported_at`, `approved_at`, `rejected_at` e `created_at`, e manteve o runtime publico blindado contra falhas de ops/auditoria.

## Inventario do que foi encontrado

### `price_reports`

- `reported_at` - canonico e usado nas queries
- `approved_at` - canonico e usado nas queries
- `rejected_at` - canonico e usado nas queries
- `created_at` - canonico e usado como fallback temporal
- `observed_at` - legado, removido das leituras de runtime
- `submitted_at` - legado, removido das leituras de runtime

### Camadas de ops/auditoria auditadas

- `collector_trust`
- `operational_logs`
- `territorial_rollout_logs`
- `audit_daily_city_prices`
- `price_reports`

## Matriz final

| Objeto esperado | Status no banco real | Acao tomada | Resultado |
|---|---|---|---|
| `public.collector_trust` | schema cache ja havia sinalizado ausencia em leituras antigas; migration existe no repositorio | queries de trust mantidas com leitura canonica e sem dependencia publica | runtime interno nao gera cascata para publico |
| `public.operational_logs` | migration existe no repositorio | mantido como superficie interna; leituras com fallback silencioso | ruido operacional reduzido |
| `public.territorial_rollout_logs` | migration existe no repositorio | mantido como superficie interna; sem dependencia publica | admin/ops segue funcional |
| `public.audit_daily_city_prices` | migration existe no repositorio | queries de auditoria normalizadas e sem aliases antigos | relatorios internos voltam a usar a view canonica |
| `public.price_reports.approved_at` | coluna canonica esperada | queries corrigidas para colunas canonicas; nenhum uso de aliases antigos permanece | erro de coluna legada eliminado no runtime |
| `public.price_reports.reported_at` | coluna canonica esperada | padronizacao aplicada em inserts, selects e mappers | linha de tempo consistente |

## Causa raiz

1. **Query legada**
   - Parte das leituras operacionais ainda pedia aliases antigos de tempo em `price_reports`.
   - Isso era suficiente para produzir erro de coluna inexistente quando o schema cache ou o select atingia a rota errada.

2. **Schema cache stale**
   - O ambiente real ja vinha acusando ausencia em cache para algumas superficies de ops/auditoria.
   - Como as migrations ja estavam presentes no repositorio, o problema principal nao era falta de definicao local, mas desalinhamento do runtime com o schema carregado.

3. **Nome canonico divergente**
   - O schema canonico de tempo em `price_reports` e `reported_at`, `approved_at`, `rejected_at` e `created_at`.
   - `observed_at` e `submitted_at` eram residuos legados e foram removidos das leituras.

4. **Superficie interna sem fallback**
   - Leitores internos podiam propagar falha para o servidor de forma repetitiva.
   - Isso foi endurecido para evitar cascata no runtime publico.

## Diff focado

Arquivos ajustados nesta passada:

- [app/enviar/actions.ts](C:/Projetos/Tanque%20Aberto/app/enviar/actions.ts)
- [lib/audit/queries.ts](C:/Projetos/Tanque%20Aberto/lib/audit/queries.ts)
- [lib/data/mappers.ts](C:/Projetos/Tanque%20Aberto/lib/data/mappers.ts)
- [lib/ops/launch-observability.ts](C:/Projetos/Tanque%20Aberto/lib/ops/launch-observability.ts)
- [lib/ops/cycle-latency.ts](C:/Projetos/Tanque%20Aberto/lib/ops/cycle-latency.ts)
- [types/supabase.ts](C:/Projetos/Tanque%20Aberto/types/supabase.ts)
- [supabase/migrations/20260322_006_audit_analytics.sql](C:/Projetos/Tanque%20Aberto/supabase/migrations/20260322_006_audit_analytics.sql)
- [supabase/migrations/20260327_019_schema_runtime_reconciliation.sql](C:/Projetos/Tanque%20Aberto/supabase/migrations/20260327_019_schema_runtime_reconciliation.sql)
- [scripts/check-schema-drift.ts](C:/Projetos/Tanque%20Aberto/scripts/check-schema-drift.ts)
- [scripts/check-schema-drift.cjs](C:/Projetos/Tanque%20Aberto/scripts/check-schema-drift.cjs)

## Resultado pratico

- Nenhuma query publica ficou dependente das superficies internas de ops/auditoria.
- `price_reports` deixou de depender de nomes legados.
- O runtime interno passou a tolerar ausencia temporaria de schema cache em superficies nao publicas.
- O ruido de `observed_at` e `submitted_at` foi eliminado das leituras de runtime.

## Validacao

Validacoes executadas e aprovadas:

- `npm run typecheck`
- `npm run build`
- `npm run verify`
- smoke local sem repeticao dos erros legados de `price_reports`, `collector_trust`, `operational_logs`, `territorial_rollout_logs` e `audit_daily_city_prices`

## Observacao operacional

Os campos `observedAt` e `submittedAt` continuam existindo na camada de dominio para compatibilidade do app, mas agora sao derivados de `reported_at` e `created_at`, sem depender de colunas legadas no banco.

## Validacao

- `npm run typecheck` passou.
- `npm run build` passou.
- `npm run verify` passou.
- Smoke local em `/`, `/admin/ops` e `/postos/sem-atualizacao` abriu sem repetir os erros de `collector_trust`, `operational_logs`, `territorial_rollout_logs`, `audit_daily_city_prices` ou `price_reports.approved_at`.
- O stderr do smoke mostrou apenas falhas de fetch externas do sandbox, sem regressao de schema/cache nas dependencias auditadas.
