# Estado da Nação: alinhamento produção / schema real

## Resumo executivo

Consegui validar o projeto real conectado pelo app: a URL em `.env.local` aponta para `https://lgnlgyctyxorumvzbtfl.supabase.co`, ou seja, o ambiente consultado é o ambiente correto do projeto.

A consulta ao banco via service role retornou o seguinte padrão:
- `PGRST205 Could not find the table ... in the schema cache` para as tabelas esperadas
- `42703 column price_reports.observed_at does not exist`

Isso indica um de dois cenários:
- migrations ainda não aplicadas no banco real, ou
- schema cache do PostgREST/Supabase desatualizado após a migração

Como este ambiente não tem a conexão SQL direta ao Postgres, não foi possível executar a confirmação por catálogo nem forçar o `reload schema` no banco. Em compensação, o runtime foi endurecido para não ficar emitindo erro repetitivo quando o schema não está visível.

## Tabela final

| Objeto esperado | Status no banco real | Ação tomada | Resultado |
| --- | --- | --- | --- |
| `public.sys_config` | `PGRST205` no schema cache | Adicionado fallback silencioso em `lib/ops/kill-switches.ts` | Leitura volta para defaults sem poluir o runtime |
| `public.beta_feedback_submissions` | `PGRST205` no schema cache | Fallback silencioso em `lib/beta/feedback.ts` | Leitura de feedback beta retorna vazio quando o schema não aparece |
| `public.audit_station_groups` | `PGRST205` no schema cache | Fallback silencioso em `lib/audit/groups.ts` | Leitura de grupos e membros não derruba a página |
| `public.audit_daily_city_prices` | não validado por catálogo; runtime anterior dependia da view | Mantido fallback para consulta bruta e sem `observed_at` | Painéis de auditoria continuam com fallback por `reported_at` |
| `public.audit_daily_station_prices` | não validado por catálogo; runtime anterior dependia da view | Mantido fallback para consulta bruta e sem `observed_at` | Painéis de auditoria continuam com fallback por `reported_at` |
| `public.operational_events` | `PGRST205` no schema cache | Camada de leitura operacional já existente; consultas críticas seguem o fallback do app | Os painéis não devem mais falhar em cascata se a tabela não estiver exposta |
| `price_reports.observed_at` | `42703 does not exist` | Removido do `reportSelect` em `lib/audit/queries.ts` | Query de auditoria deixa de pedir a coluna ausente |

## Migrations relevantes

As migrations necessárias já existem no repositório:
- `supabase/migrations/20260322_006_audit_analytics.sql`
- `supabase/migrations/20260322_007_civic_dossiers.sql`
- `supabase/migrations/20260322_009_beta_security_observability.sql`
- `supabase/migrations/20260322_010_beta_closed_feedback.sql`
- `supabase/migrations/20260322_011_feedback_triage.sql`
- `supabase/migrations/20260322_012_beta_invites_and_ops_triage.sql`
- `supabase/migrations/20260322_013_operational_alerts.sql`
- `supabase/migrations/20260323_014_automated_rollout_schema.sql`
- `supabase/migrations/20260324_015_collector_trust.sql`
- `supabase/migrations/20260324_016_alert_actionability.sql`
- `supabase/migrations/20260324_017_cohort_segmentation.sql`
- `supabase/migrations/20260324_018_beta_decision_framework.sql`
- `supabase/migrations/20260327_019_schema_runtime_reconciliation.sql`
- `supabase/migrations/20260327_020_collector_trust_stage_alignment.sql`
- `supabase/migrations/20260327_021_submission_hardening.sql`

Não criei migration nova porque o pacote de schema esperado já está presente. O bloqueio hoje é a aplicação no ambiente real ou a recarga do cache do PostgREST/Supabase.

## Diff focado

Arquivos ajustados nesta passada:
- [lib/supabase/schema-cache.ts](C:/Projetos/Tanque%20Aberto/lib/supabase/schema-cache.ts)
- [lib/ops/kill-switches.ts](C:/Projetos/Tanque%20Aberto/lib/ops/kill-switches.ts)
- [lib/beta/feedback.ts](C:/Projetos/Tanque%20Aberto/lib/beta/feedback.ts)
- [lib/audit/groups.ts](C:/Projetos/Tanque%20Aberto/lib/audit/groups.ts)
- [lib/audit/queries.ts](C:/Projetos/Tanque%20Aberto/lib/audit/queries.ts)

## Validação

Executado com sucesso:
- `npm run typecheck`
- `npm run build`
- `npm run verify`

## Resultado prático

- O app está conectado ao projeto correto.
- O runtime real ainda enxerga o schema como ausente para as tabelas críticas.
- A leitura do `observed_at` foi removida da query de auditoria para não depender de uma coluna ausente no banco exposto.
- A próxima ação externa necessária é aplicar as migrations no banco real e forçar a recarga do schema cache.
