# Estado da Nação: isolamento do runtime público

## Resumo executivo

O runtime público do Bomba Aberta foi desacoplado das leituras administrativas e de auditoria que estavam gerando cascata de erro quando o schema exposto pelo PostgREST ficava parcialmente indisponível.

O ajuste principal foi arquitetural:
- rotas públicas deixaram de depender de `sys_config`/kill switches para renderizar;
- tabelas e views internas continuam válidas para admin/ops, mas agora falham de forma explícita apenas nas superfícies internas;
- leituras públicas quebráveis passaram a usar fallback silencioso quando o schema não aparece no cache;
- a query de auditoria deixou de pedir `price_reports.submitted_at`, que não existe no ambiente real.

## Dependências públicas vs internas

### Públicas críticas

Estas dependências podem impactar o carregamento público, então foram isoladas ou endurecidas com fallback:
- `price_reports` com `reported_at`, `approved_at`, `rejected_at`, `created_at`
- `stations`
- `audit_daily_station_prices` e `audit_daily_city_prices`, apenas como enriquecimento opcional da auditoria pública
- `audit_station_groups`, apenas quando há filtro territorial explícito

### Internas / operacionais

Estas dependências ficam restritas a admin/ops e não podem poluir o runtime público:
- `sys_config`
- `operational_events`
- `beta_feedback_submissions`
- `audit_station_groups` quando consumidas por telas de ops
- `audit_daily_city_prices`
- `audit_daily_station_prices`
- `collector_trust`
- trilhas de moderação e observabilidade operacional

## O que foi isolado

### 1. Kill switches

`getKillSwitches()` continua útil para admin/ops, mas não entra mais no carregamento público de:
- `/`
- `/postos/[id]`

Se `sys_config` faltar, o público continua renderizando com defaults silenciosos.

### 2. Auditoria pública

A camada de auditoria ainda tenta usar agregados diários quando eles existem, mas:
- se `audit_daily_station_prices` ou `audit_daily_city_prices` não estiverem expostas, a página cai para `price_reports` brutos;
- se o schema cache estiver desatualizado, a falha é tratada como ausência do objeto, não como crash do servidor público.

### 3. Feedback beta e grupos territoriais

Essas leituras são internas por natureza. Quando o schema não está visível:
- admin/ops ainda podem mostrar erro explícito;
- o runtime público não repete o mesmo erro em cascata.

## Mapa final de dependência

| Dependência | Tipo | Superfície pública | Superfície interna |
| --- | --- | --- | --- |
| `sys_config` | operacional | isolada com fallback | explícita |
| `operational_events` | operacional | não deve bloquear | explícita |
| `beta_feedback_submissions` | operacional | não deve bloquear | explícita |
| `audit_station_groups` | territorial | opcional/silenciosa | explícita |
| `audit_daily_city_prices` | auditoria | fallback para bruto | explícita |
| `audit_daily_station_prices` | auditoria | fallback para bruto | explícita |
| `price_reports.submitted_at` | legado de query | removido do select | não aplicável |

## Diff focado

Arquivos ajustados nesta passada:
- [lib/audit/queries.ts](C:/Projetos/Tanque%20Aberto/lib/audit/queries.ts)
- [lib/supabase/schema-cache.ts](C:/Projetos/Tanque%20Aberto/lib/supabase/schema-cache.ts)
- [lib/ops/kill-switches.ts](C:/Projetos/Tanque%20Aberto/lib/ops/kill-switches.ts)
- [lib/beta/feedback.ts](C:/Projetos/Tanque%20Aberto/lib/beta/feedback.ts)
- [lib/audit/groups.ts](C:/Projetos/Tanque%20Aberto/lib/audit/groups.ts)
- [app/page.tsx](C:/Projetos/Tanque%20Aberto/app/page.tsx)
- [app/postos/[id]/page.tsx](C:/Projetos/Tanque%20Aberto/app/postos/[id]/page.tsx)

## Resultado prático

- O público deixa de depender de leituras administrativas para renderizar.
- Falhas de schema em tabelas internas não geram cascata de erro repetitivo no servidor público.
- O admin/ops continua com leitura explícita de erro, que é o comportamento correto para superfícies internas.
- A query pública de auditoria deixa de pedir uma coluna ausente no ambiente real.

## Validação

Executado com sucesso:
- `npm run typecheck`
- `npm run build`
- `npm run verify`
- `npm run go-live:check`

## Observação operacional

O schema real ainda pode estar desatualizado para algumas tabelas internas no PostgREST. O runtime público não depende mais disso para entrar em pé.
