# Estado da Nacao - release commit plan final

Data: 2026-03-28

## Objetivo

Fechar o worktree em uma linha de release limpa, sem mudar o comportamento publico ja validado, separando codigo funcional, saneamento de schema/runtime, observabilidade e tooling de go-live.

## Sequencia final de commits

### Pacote 1 - runtime/deploy

Sugestao de commit: `chore: consolidar runtime e deploy publico`

Entrar nesta ordem:
- `app/layout.tsx`
- `app/page.tsx`
- `app/atualizacoes/page.tsx`
- `app/enviar/page.tsx`
- `app/hub/page.tsx`
- `components/layout/app-shell.tsx`
- `components/layout/bottom-nav.tsx`
- `components/layout/global-submit-cta.tsx`
- `components/layout/top-orchestrator.tsx`
- `public/sw.js`
- `lib/runtime/build-info.ts`
- `lib/supabase/*`
- `package.json` quando ligado a `launch` / `go-live`

Observacao:
- este pacote sustenta o runtime publico e o alvo real de deploy.

### Pacote 2 - schema/runtime cleanup

Sugestao de commit: `fix: alinhar schema e runtime das camadas internas`

Entrar nesta ordem:
- `lib/audit/queries.ts`
- `lib/audit/*`
- `lib/data/mappers.ts`
- `lib/data/queries.ts`
- `lib/ops/collector-trust.ts`
- `lib/ops/cycle-latency.ts`
- `lib/ops/launch-observability.ts`
- `lib/ops/kill-switches.ts`
- `lib/ops/logs.ts`
- `types/supabase.ts`
- `supabase/migrations/20260322_006_audit_analytics.sql`
- `supabase/migrations/20260327_019_schema_runtime_reconciliation.sql`
- `supabase/migrations/20260327_020_collector_trust_stage_alignment.sql`
- `supabase/migrations/20260327_021_submission_hardening.sql`
- `scripts/check-schema-drift.ts`
- `scripts/check-schema-drift.cjs`
- `scripts/refresh-audit-analytics.ts`

Observacao:
- este pacote remove aliases legados e fecha o drift de `price_reports` e das views/leituras internas.

### Pacote 3 - observability/runtime severity

Sugestao de commit: `feat: classificar erros por severidade sem poluir runtime publico`

Entrar nesta ordem:
- `lib/observability/runtime-issues.ts`
- `app/actions/user.ts`
- `app/admin/ops/actions.ts`
- `app/atualizacoes/page.tsx`
- `app/enviar/page.tsx`
- `app/hub/page.tsx`
- `lib/beta/feedback.ts`
- `lib/ops/groups.ts`
- `lib/ops/observability.ts`
- `lib/ops/alerts.ts`
- `lib/ops/beta-synthesis.ts`
- `lib/ops/collector-trust.ts`
- `lib/ops/logs.ts`
- `lib/audit/queries.ts`

Observacao:
- este pacote e incremental sobre os pacotes 1 e 2.
- os arquivos repetidos aqui sao intencionais: a camada de severidade entra por cima do runtime e do cleanup.

### Pacote 4 - release gate/go-live

Sugestao de commit: `chore: fechar gate de go-live e evidencias finais`

Entrar nesta ordem:
- `scripts/launch-gate.ts`
- `tests/go-live-public.spec.ts`
- `tests/cta-governance.spec.ts`
- `app/api/health/route.ts`
- `app/api/telemetry/route.ts`
- `app/api/admin/ops/export/route.ts`
- `app/api/cron/audit/*`
- `reports/estado-da-nacao-go-live-publico-final.md`
- `reports/estado-da-nacao-go-live-real-final.md`
- `reports/estado-da-nacao-go-live-real-rerun-final.md`
- `reports/estado-da-nacao-deployment-real-vercel-fix.md`
- `reports/estado-da-nacao-saneamento-final-ops-auditoria.md`
- `reports/estado-da-nacao-classificacao-de-erros-runtime.md`
- `reports/estado-completo-do-projeto-bomba-aberta.md`
- `reports/estado-da-nacao-consolidacao-release-final.md`

Observacao:
- este pacote fecha a prova de go-live e organiza a evidencia de manutencao pos-lancamento.

## O que entra no release final

- runtime publico validado
- shell publico final
- schema/runtime cleanup das camadas internas
- classificacao semantica de erros
- launch gate e smoke de producao
- relatorios `Estado da Nacao` finais

## O que fica fora do release final

Artefatos temporarios removidos desta consolidacao:
- `smoke-runtime.*`
- `go-live-local.*`
- `go-live-server*.log`
- `legacy-columns-smoke.*`
- `sem-atualizacao-server*.log`
- `test-results/`
- `reports/cta-governance-screenshots/`
- `reports/shell-public-final/`
- `reports/release-gate-preview-real/`
- `reports/lista-operacional-desktop-v3-preview*`
- qualquer trace, screenshot, video ou log descartavel de smoke/e2e

Pendencia conhecida de limpeza:
- `reports/hub-start-log.txt` ficou travado por outro processo no momento da limpeza e nao entrou no release final.

## Lista curta do que deve entrar em cada commit

### Commit 1

- runtime publico e deploy

### Commit 2

- cleanup de schema/runtime e migrations canonicas

### Commit 3

- classificacao de severidade e isolamento de ruido interno

### Commit 4

- gate de go-live, testes de producao e relatorios finais

## Validacao obrigatoria

Rodado no estado final antes desta consolidacao:
- `npm run typecheck`
- `npm run build`
- `npm run verify`

## Conclusao

A base funcional esta pronta. O que falta e apenas empacotar o que ja esta validado em commits legiveis, mantendo o release limpo e a manutencao pos-lancamento compreensivel.
