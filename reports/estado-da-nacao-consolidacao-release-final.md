# Estado da Nacao - consolidacao release final

Data: 2026-03-28

## Resumo executivo

O repositório chegou em um estado funcional de lancamento: go-live real em GO, runtime publico isolado, saneamento de ops/auditoria concluido e observabilidade semantica separando erro publico de ruido interno.

O problema remanescente nao e funcional. E de organizacao do worktree: ha muitas frentes ja validadas misturadas com tooling, relatórios, logs temporarios e artefatos de teste que nao deveriam entrar no commit final de release.

A consolidacao abaixo separa o que pertence a linha final de release do que deve ficar fora ou ser arquivado.

## Sequencia curta de commits sugerida

### 1. `runtime/deploy`

Escopo:
- base do runtime publico e do shell final já validado
- isolamento de `SubmissionHistoryProvider` fora do `app/layout.tsx`
- ajustes de rota e shell para `/`, `/atualizacoes`, `/enviar` e `/hub`
- arquivos de infraestrutura de execucao que sustentam o deploy real

Inclui:
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
- `package.json` quando ligado a comando de launch/go-live

### 2. `schema/runtime cleanup`

Escopo:
- saneamento de `price_reports`
- alinhamento de `collector_trust`, `operational_logs`, `territorial_rollout_logs` e views de auditoria
- remoção de aliases legados e normalizacao de mappers

Inclui:
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

### 3. `observability/runtime severity`

Escopo:
- classificacao semantica de erros
- separacao de erro publico critico, warning publico e ruido interno
- stop de spam repetitivo no servidor

Inclui:
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

### 4. `release gate/go-live`

Escopo:
- comando final de go-live
- checagens reais do alvo publico
- smoke e verificacoes de producao
- relatorios de validacao final

Inclui:
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

## O que entra no release final

### Codigo funcional

- rotas publicas e shell final
- fluxo de envio, hub e atualizacoes
- hooks de sessao local e identidade progressiva
- runtime de ops/auditoria canonico
- classificacao semantica de erros
- launch gate e smoke de go-live
- migrações relevantes do schema

### Documentacao e evidencia

- relatorios `Estado da Nacao` que registram o estado final
- matriz de go-live e operacao da primeira semana
- relatorios de saneamento, reconciliacao e observabilidade

## O que fica fora do commit final

### Artefatos temporarios

Removidos do worktree nesta consolidacao:
- `smoke-runtime.*`
- `go-live-local.*`
- `go-live-server*.log`
- `legacy-columns-smoke.*`
- `sem-atualizacao-server*.log`
- logs similares de smoke e gate

### Artefatos de teste

Ficam fora do commit final de release:
- `test-results/`
- traces, screenshots, videos e error-context gerados por Playwright
- dados de retry de smoke/e2e

### Frentes ainda abertas no worktree

O worktree ainda contem muitas alteracoes amplas de produto e tooling. Para a linha final de release, o ideal e separar esses grupos em commits claros, nao tentar levar tudo junto.

## Recomendacao pratica de corte

1. Fechar primeiro o commit de runtime/deploy.
2. Em seguida consolidar schema/runtime cleanup.
3. Depois registrar observability/runtime severity.
4. Encerrar com release gate/go-live e relatorios finais.
5. Arquivar ou remover os artefatos temporarios de teste antes do commit final.

## Validacao

A validacao desta consolidacao segue os checks ja executados no estado atual do repositorio:

- `npm run typecheck`
- `npm run build`
- `npm run verify`

## Conclusao

A base funcional ja esta pronta. O ultimo passo agora e disciplinar o empacotamento do worktree para que a manutencao pos-lancamento fique legivel: codigo de release separado de tooling, tooling separado de evidencia e evidencia separada de lixo temporario.
