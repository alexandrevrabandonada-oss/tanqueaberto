# Estado da Nacao - classificacao de erros runtime

Data: 2026-03-28

## Resumo executivo

A observabilidade semantica foi separada em cinco classes para impedir que falhas internas de ops/auditoria parecam blocker de lancamento publico.

A mudanca principal foi concentrar a decisao em `lib/observability/runtime-issues.ts` e aplicar isso nas superficies publicas e internas que hoje mais geram fallback.

## Classes finais

- `public_blocker`
  - erro que quebra a experiencia publica sem fallback util.
  - deve continuar aparecendo como `console.error`.
- `public_warning`
  - erro em superficie publica com fallback ou degradacao segura.
  - deve aparecer como `console.warn`.
- `ops_warning`
  - falha interna relevante, mas restrita a ops/admin.
  - deve aparecer como `console.warn` com contexto acionavel.
- `ops_missing_schema`
  - falha de schema cache / tabela ausente em superficie interna.
  - deve aparecer como `console.warn` sem virar blocker publico.
- `debug_noise`
  - fallback silencioso planejado.
  - nao emite log repetitivo.

## Inventario do que foi encontrado

### Superficies publicas

- [`app/actions/user.ts`](C:/Projetos/Tanque%20Aberto/app/actions/user.ts)
  - `getUtilityStatusAction`
  - `getProgressiveIdentityAction`
  - agora classificam falha de trust/identidade como `public_warning` com fallback para `null`.
- [`app/atualizacoes/page.tsx`](C:/Projetos/Tanque%20Aberto/app/atualizacoes/page.tsx)
  - a leitura do feed caiu para `public_warning` com fallback para lista vazia.
- [`app/enviar/page.tsx`](C:/Projetos/Tanque%20Aberto/app/enviar/page.tsx)
  - a busca de postos caiu para `public_warning` com fallback para lista vazia.
- [`app/hub/page.tsx`](C:/Projetos/Tanque%20Aberto/app/hub/page.tsx)
  - a busca de postos caiu para `public_warning` com fallback para lista vazia.
- [`lib/ops/collector-trust.ts`](C:/Projetos/Tanque%20Aberto/lib/ops/collector-trust.ts)
  - falha ao criar trust passou a ser `public_warning` com fallback para trust padrao.

### Superficies internas de ops/auditoria

- [`lib/audit/queries.ts`](C:/Projetos/Tanque%20Aberto/lib/audit/queries.ts)
  - leituras de `stations`, `price_reports`, `audit_daily_station_prices` e `audit_daily_city_prices` agora usam `ops_missing_schema`/`ops_warning` com fallback util.
- [`lib/beta/feedback.ts`](C:/Projetos/Tanque%20Aberto/lib/beta/feedback.ts)
  - resumo e leitura de feedback beta passaram a `ops_warning` com fallback vazio.
- [`lib/ops/kill-switches.ts`](C:/Projetos/Tanque%20Aberto/lib/ops/kill-switches.ts)
  - leitura de `sys_config` agora vira `ops_missing_schema` ou `ops_warning` com defaults.
- [`lib/ops/groups.ts`](C:/Projetos/Tanque%20Aberto/lib/ops/groups.ts)
  - seed de `audit_station_groups` e `audit_station_group_members` passou a emitir `ops_missing_schema`/`ops_warning` sem poluir o runtime publico.
- [`lib/ops/logs.ts`](C:/Projetos/Tanque%20Aberto/lib/ops/logs.ts)
  - grava��es de `operational_events` e `admin_action_logs` agora entram como `ops_warning`/`ops_missing_schema` com descarte do evento quando necessario.
- [`app/admin/ops/actions.ts`](C:/Projetos/Tanque%20Aberto/app/admin/ops/actions.ts)
  - erros recuperaveis de update, history, quick feedback e execucao operacional passaram a ser classificados em `ops_warning`.

## Matriz de severidade

| Classe | Onde aparece | Log | Acao |
|---|---|---|---|
| `public_blocker` | rota publica sem fallback | `console.error` | corrigir antes de abrir |
| `public_warning` | rota publica com fallback | `console.warn` | monitorar e corrigir sem travar lancamento |
| `ops_warning` | admin/ops com falha acionavel | `console.warn` | corrigir em seguida |
| `ops_missing_schema` | schema ausente/cache stale em ops | `console.warn` | aplicar migration/refresh cache |
| `debug_noise` | fallback silencioso planejado | nenhum | ignorar |

## Exemplos de logs antes e depois

### Antes

- `Failed to fetch feed in UpdatesPage` + stack completo
- `Failed to load beta feedback summary` + stack completo
- `Kill switches table access failed, using defaults` sem categoria semantica
- `Failed to record operational event` sem diferenciar falha publica de ruído interno

### Depois

- `[public_warning] public/pages/atualizacoes: Failed to fetch feed in UpdatesPage`
- `[ops_missing_schema] ops/kill-switches.getKillSwitches: Kill switches table access failed, using defaults`
- `[ops_warning] beta/feedback.getBetaFeedbackSummary: Failed to load beta feedback summary`
- `[ops_warning] admin/ops.executeOperationalAction: Failed to execute operational action`

## Diff focado

Arquivos ajustados:

- [`lib/observability/runtime-issues.ts`](C:/Projetos/Tanque%20Aberto/lib/observability/runtime-issues.ts)
- [`app/actions/user.ts`](C:/Projetos/Tanque%20Aberto/app/actions/user.ts)
- [`app/atualizacoes/page.tsx`](C:/Projetos/Tanque%20Aberto/app/atualizacoes/page.tsx)
- [`app/enviar/page.tsx`](C:/Projetos/Tanque%20Aberto/app/enviar/page.tsx)
- [`app/hub/page.tsx`](C:/Projetos/Tanque%20Aberto/app/hub/page.tsx)
- [`app/admin/ops/actions.ts`](C:/Projetos/Tanque%20Aberto/app/admin/ops/actions.ts)
- [`lib/audit/queries.ts`](C:/Projetos/Tanque%20Aberto/lib/audit/queries.ts)
- [`lib/beta/feedback.ts`](C:/Projetos/Tanque%20Aberto/lib/beta/feedback.ts)
- [`lib/ops/collector-trust.ts`](C:/Projetos/Tanque%20Aberto/lib/ops/collector-trust.ts)
- [`lib/ops/groups.ts`](C:/Projetos/Tanque%20Aberto/lib/ops/groups.ts)
- [`lib/ops/kill-switches.ts`](C:/Projetos/Tanque%20Aberto/lib/ops/kill-switches.ts)
- [`lib/ops/logs.ts`](C:/Projetos/Tanque%20Aberto/lib/ops/logs.ts)

## Resultado

- Erro interno de ops nao polui mais a leitura do runtime publico.
- Logs agora carregam contexto de superficie e severidade sem virar ruido de stack.
- Falhas de schema cache sao classificadas como `ops_missing_schema` e ficam isoladas de `public_blocker`.
- O time passa a diferenciar claramente "nao lancar" de "arrumar admin depois".

## Validacao

A validacao sera rodada nesta passada com:

- `npm run verify`

## Observacao

`debug_noise` existe como classe, mas permanece silenciosa por design para nao reintroduzir spam de log em fallbacks planejados.
