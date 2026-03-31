# Estado da Nação: cleanup de legacy columns em `price_reports`

## Resumo executivo

Eliminei as leituras legadas de `observed_at` e `submitted_at` que ainda chegavam ao runtime a partir de `price_reports`.

Depois da limpeza:
- queries de runtime passaram a ler apenas `reported_at`, `approved_at`, `rejected_at` e `created_at`;
- o mapper de `price_reports` derivou os campos de app a partir dos nomes canônicos;
- o launch observability e a métrica de latência deixaram de consultar os aliases antigos;
- o schema drift check deixou de exigir `price_reports.observed_at`;
- o smoke local em uma rota interna de ops e em uma rota pública não mostrou mais `submitted_at`/`observed_at` no stderr.

## Colunas canônicas confirmadas

Para `price_reports`, o runtime agora usa como fonte canônica:
- `reported_at`
- `approved_at`
- `rejected_at`
- `created_at`

Os campos `observedAt` e `submittedAt` ainda existem no modelo de domínio `PriceReport`, mas são derivados de `reported_at` e `created_at` e não dependem mais de colunas legadas do banco.

## Inventário de ocorrências encontradas

| Arquivo | Ocorrência antiga | Ação tomada | Situação final |
| --- | --- | --- | --- |
| [app/enviar/actions.ts](C:/Projetos/Tanque%20Aberto/app/enviar/actions.ts) | `observed_at`, `submitted_at` no `insert` | Removi os campos legados do payload | Só `reported_at` permanece |
| [lib/ops/launch-observability.ts](C:/Projetos/Tanque%20Aberto/lib/ops/launch-observability.ts) | `submitted_at` no `select` e no cálculo | Troquei por `reported_at` e fallback em `created_at` | Sem leitura legada |
| [lib/ops/cycle-latency.ts](C:/Projetos/Tanque%20Aberto/lib/ops/cycle-latency.ts) | `submitted_at` no `select` e cálculo | Troquei por `reported_at` | Sem leitura legada |
| [lib/data/mappers.ts](C:/Projetos/Tanque%20Aberto/lib/data/mappers.ts) | `row.observed_at`, `row.submitted_at` | Passei a derivar de `reported_at` e `created_at` | Mapper canônico |
| [lib/audit/queries.ts](C:/Projetos/Tanque%20Aberto/lib/audit/queries.ts) | aliases legados no materializado de leitura | Passei a expor `reportedAt`/`createdAt` | Sem dependência de coluna legada |
| [types/supabase.ts](C:/Projetos/Tanque%20Aberto/types/supabase.ts) | `observed_at`, `submitted_at` no tipo da linha | Removi os campos | Tipo alinhado ao schema real |
| [supabase/migrations/20260322_006_audit_analytics.sql](C:/Projetos/Tanque%20Aberto/supabase/migrations/20260322_006_audit_analytics.sql) | `coalesce(pr.observed_at, pr.reported_at)` e colunas legadas no latest view | Canonizei os agregados para `reported_at` | Nova base não recria legado |
| [supabase/migrations/20260327_019_schema_runtime_reconciliation.sql](C:/Projetos/Tanque%20Aberto/supabase/migrations/20260327_019_schema_runtime_reconciliation.sql) | criação de `observed_at`/`submitted_at` e índice de `observed_at` | Removi os campos e o índice legado | Migration alinhada |
| [scripts/check-schema-drift.ts](C:/Projetos/Tanque%20Aberto/scripts/check-schema-drift.ts) | guardrail exigia `price_reports.observed_at` | Troquei por checagem de `price_reports_reported_at_idx` | Drift check canônico |
| [scripts/check-schema-drift.cjs](C:/Projetos/Tanque%20Aberto/scripts/check-schema-drift.cjs) | guardrail exigia `price_reports.observed_at` | Troquei por checagem de `price_reports_reported_at_idx` | Drift check canônico |

## Diff focado

Arquivos alterados nesta passada:
- [app/enviar/actions.ts](C:/Projetos/Tanque%20Aberto/app/enviar/actions.ts)
- [lib/ops/launch-observability.ts](C:/Projetos/Tanque%20Aberto/lib/ops/launch-observability.ts)
- [lib/ops/cycle-latency.ts](C:/Projetos/Tanque%20Aberto/lib/ops/cycle-latency.ts)
- [lib/data/mappers.ts](C:/Projetos/Tanque%20Aberto/lib/data/mappers.ts)
- [lib/audit/queries.ts](C:/Projetos/Tanque%20Aberto/lib/audit/queries.ts)
- [types/supabase.ts](C:/Projetos/Tanque%20Aberto/types/supabase.ts)
- [supabase/migrations/20260322_006_audit_analytics.sql](C:/Projetos/Tanque%20Aberto/supabase/migrations/20260322_006_audit_analytics.sql)
- [supabase/migrations/20260327_019_schema_runtime_reconciliation.sql](C:/Projetos/Tanque%20Aberto/supabase/migrations/20260327_019_schema_runtime_reconciliation.sql)
- [scripts/check-schema-drift.ts](C:/Projetos/Tanque%20Aberto/scripts/check-schema-drift.ts)
- [scripts/check-schema-drift.cjs](C:/Projetos/Tanque%20Aberto/scripts/check-schema-drift.cjs)
- [reports/estado-da-nacao-cleanup-price-reports-legacy-columns.md](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-cleanup-price-reports-legacy-columns.md)

## Validação

Executado com sucesso:
- `npm run typecheck`
- `npm run build`
- `npm run verify`

Smoke adicional executado:
- `npm run start`
- `GET /admin/ops`
- `GET /postos/sem-atualizacao`

Resultado do smoke:
- stderr sem ocorrências de `submitted_at`
- stderr sem ocorrências de `observed_at`

## Resultado prático

- Não ficou nenhuma query pública ou interna pedindo coluna legada de tempo em `price_reports`.
- O runtime passou a depender só dos nomes canônicos do schema.
- O guardrail de drift agora protege o padrão novo, não o legado.
