# Estado da Nação - Reconciliacao Schema / Runtime

Data: 2026-03-27
Escopo: Supabase/PostgREST runtime vs. migrations reais

## Resumo Executivo
O runtime do Bomba Aberta estava misturando três classes de problema:
1. objetos realmente ausentes no banco (`sys_config`, `operational_logs`, `price_report_audit_events`);
2. colunas ausentes em tabelas reais (`price_reports`, `stations`, `collector_trust`, `beta_feedback_submissions`);
3. drift de nomenclatura entre o que o código chama e o que as migrations criaram (`station_groups` vs `audit_station_groups`, `beta_feedback` vs `beta_feedback_submissions`, `beta_invites` vs `beta_invite_codes`).

A reconciliação desta passada fechou o drift crítico sem mexer em branding ou layout.

## Inventário Objetivo

### Tabelas esperadas pelo runtime
- `public.stations`
- `public.price_reports`
- `public.admin_users`
- `public.audit_station_groups`
- `public.audit_station_group_members`
- `public.audit_report_runs`
- `public.audit_alert_history`
- `public.ops_job_runs`
- `public.report_submission_rate_limits`
- `public.operational_events`
- `public.admin_action_logs`
- `public.operational_alerts`
- `public.collector_trust`
- `public.cohort_change_log`
- `public.beta_feedback_submissions`
- `public.beta_invite_codes`
- `public.beta_decision_snapshots`
- `public.territorial_rollout_logs`
- `public.sys_config` `[-` novo nesta passada
- `public.operational_logs` `[-` novo nesta passada
- `public.price_report_audit_events` `[-` novo nesta passada

### Views / materialized views esperadas
- `public.latest_station_prices`
- `public.audit_daily_station_prices`
- `public.audit_daily_city_prices`
- `public.audit_latest_station_prices`

### Enums esperados
- `public.fuel_type`
- `public.report_status`

### RPCs / funções esperadas
- `public.register_submission_rate_limit(...)`
- `public.is_admin_email(...)`
- `public.sync_station_last_reported_at()` `[-` novo nesta passada

## Divergências Encontradas

### Objetos ausentes de fato
- `public.sys_config`
- `public.operational_logs`
- `public.price_report_audit_events`

### Colunas ausentes em `price_reports`
O runtime já dependia destas colunas, mas a base inicial não tinha todas:
- `observed_at`
- `submitted_at`
- `approved_at`
- `rejected_at`
- `moderated_by`
- `moderation_reason`
- `source_kind`
- `photo_hash`
- `location_distance`
- `location_confidence`
- `reconciliation_id`
- `is_confirmation`
- `metadata`
- `version`

### Colunas ausentes em `stations`
- `last_reported_at`

### Colunas ausentes em `collector_trust`
- `streak_days`
- `missions_completed`
- `is_tester`

### Colunas ausentes em `beta_feedback_submissions`
- `triage_notes`
- `updated_at`

### Drift de nomes
- runtime antigo usava `station_groups`; a tabela real é `audit_station_groups`
- runtime antigo usava `beta_feedback`; a tabela real é `beta_feedback_submissions`
- runtime antigo usava `beta_invites`; a tabela real é `beta_invite_codes`

### Drift de vocabulário em `collector_trust.trust_stage`
- o banco antigo restringia valores em inglês (`new`, `trusted`, `review_needed`, `blocked`)
- o runtime atual escreve e lê valores em português (`novo`, `confiável`, `muito_confiável`, `em_revisão`, `bloqueado`)

## Queries Corrigidas Nesta Passada
- `app/admin/actions.ts`
  - `station_groups` -> `audit_station_groups`
- `app/admin/ops/actions.ts`
  - `beta_feedback` -> `beta_feedback_submissions`
  - `beta_invites` -> `beta_invite_codes`
  - triagem de feedback passou a atualizar `triage_status`, `status`, `triage_notes` e `updated_at`
- `lib/ops/hub-analytics.ts`
  - leitura passou de `operational_logs` para `operational_events`
  - leitura da ação passou a usar `payload.action`
- `lib/ops/hub-recommendation.ts`
  - troca de `rejection_reason` para `moderation_reason` com fallback em `moderation_note`
  - remoção do filtro inválido por `actor_id` textual em missão
- `lib/ops/collector-trust.ts`
  - normalização de `trust_stage` para português na leitura
- `components/admin/collector-trust-dashboard.tsx`
  - painel passou a aceitar estágios em português e inglês
- `app/admin/ops/collectors/page.tsx`
  - badge de estágio passou a aceitar os dois vocabulários
- `app/admin/ops/page.tsx`
  - mesma compatibilização no painel principal de Ops

## Migrations Novas
- `supabase/migrations/20260327_019_schema_runtime_reconciliation.sql`
  - cria `sys_config`
  - cria `operational_logs`
  - cria `price_report_audit_events`
  - adiciona colunas faltantes em `price_reports`
  - adiciona `stations.last_reported_at` + trigger de sincronização
  - adiciona colunas faltantes em `collector_trust` e `beta_feedback_submissions`
- `supabase/migrations/20260327_020_collector_trust_stage_alignment.sql`
  - amplia a constraint de `collector_trust.trust_stage`
  - troca o default para `novo`
  - mantém compatibilidade com legado em inglês e runtime em português

## Estratégia de Correção
### Criar o que faltava
- tabelas operacionais de suporte: `sys_config`, `operational_logs`, `price_report_audit_events`
- colunas de telemetria/qualidade faltantes em `price_reports`, `stations`, `collector_trust`, `beta_feedback_submissions`

### Adaptar queries
- alinhar nomes antigos para os nomes reais das tabelas
- usar `operational_events` onde a telemetria estrutural já existe
- normalizar o `trust_stage` na borda de leitura para não vazar legado ao UI

### Remover dependências mortas/antigas
- `beta_feedback`, `beta_invites` e `station_groups` foram removidos do runtime
- `rejection_reason` foi eliminado do fluxo operacional de hub

### Fallbacks
- apenas onde o legado ainda pode existir em registros antigos, como `trust_stage` e `moderation_note`

## Validação
- `npm run typecheck` passou
- `npm run build` passou
- `npm run verify` passou

## Conclusão
O drift crítico entre schema e runtime ficou fechado nas superfícies operacionais mais sensíveis. O próximo passo útil, se necessário, é gerar uma checagem automática de schema drift para impedir que novos nomes antigos voltem a entrar por engano.
