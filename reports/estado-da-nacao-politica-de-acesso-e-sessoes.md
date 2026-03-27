# Estado da Nacao - Politica de Acesso e Sessoes

## Resumo Executivo
A politica de acesso ficou separada por superficie.

- Publico aberto continua sem login nas rotas de leitura e descoberta.
- Sessao local sem login continua sustentando rascunho, fila e continuidade no `enviar` e no `hub`.
- Beta fechado virou gate explicito por convite/cookie apenas nas superficies beta.
- Admin ficou isolado por autenticacao forte.

O ponto principal da correcao foi remover o bloqueio beta global do middleware e retirar o noindex global do layout raiz. Antes, o beta fechado contaminava o site inteiro; agora ele afeta so o que realmente e beta.

## Matriz Final De Acesso

| Rota / superficie | Classe | Gate | Indexacao | Observacao |
| --- | --- | --- | --- | --- |
| `/` | Publico aberto | Nenhum | Indexavel | Mapa e descoberta permanecem abertos |
| `/atualizacoes` | Publico aberto | Nenhum | Indexavel | Feed publico aberto |
| `/postos/[id]` | Publico aberto | Nenhum | Indexavel | Leitura publica do posto |
| `/cidade/[slug]` | Publico aberto | Nenhum | Indexavel | Pagina publica de cidade |
| `/grupo/[slug]` | Publico aberto | Nenhum | Indexavel | Pagina publica de corredor / grupo |
| `/auditoria` e subrotas | Publico aberto | Nenhum | Indexavel | Leitura publica de auditoria |
| `/sobre`, `/offline` | Publico aberto | Nenhum | Indexavel | Rotas institucionais |
| `/enviar` | Sessao local sem login | Estado local, draft, fila | Noindex | Nao exige conta, mas e area de trabalho pessoal |
| `/hub` | Sessao local sem login | Estado local e continuidade | Noindex | Mostra ultimo gesto, fila e proximo passo |
| `/feedback` | Beta fechado | Cookie beta quando beta fechado | Noindex | Surface beta, nao publico |
| `/beta` | Beta fechado / gate | Codigo simples + cookie persistente | Noindex | Porta de entrada do beta |
| `/beta/*` | Beta fechado | Cookie beta quando beta fechado | Noindex | Subrotas beta protegidas |
| `/admin` e `/admin/*` | Auth obrigatorio | Supabase auth + allowlist `admin_users` | Noindex | Admin isolado com autenticacao forte |
| `/api/telemetry` | Publico aberto | Nenhum | N/A | Registra eventos de todas as superficies |
| `/api/admin/*` | Auth obrigatorio | `requireAdminUser()` | N/A | Operacoes administrativas |
| `/api/cron/*` | Interno | Secret / cron | N/A | Nao faz parte da superficie de usuario |

## O Que Dependia De Cookie, Auth E O Que Estava Misturado

### Cookie
- Cookie beta `bomba_aberta_beta_access` continua sendo o passaporte do beta fechado.
- O cookie e persistente por 14 dias.
- O cookie agora serve para beta e feedback beta, nao para travar o app todo.
- Em `enviar`, o cookie beta segue apenas como contexto de moderacao / telemetria, nao como bloqueio de acesso.

### Auth
- Admin usa autenticacao real via Supabase e allowlist de `admin_users`.
- `requireAdminUser()` continua sendo o guard final para escrita e moderacao sensivel.

### Misturado e corrigido
- O middleware global antes redirecionava qualquer rota nao bypassada para `/beta` quando o beta estava fechado.
- O layout raiz antes colocava `robots: noindex` no site inteiro quando o beta estava fechado.
- O endpoint de telemetry antes descartava eventos sem cookie beta quando o beta estava fechado.
- Esses tres pontos agora foram separados da superficie publica.

## Diff Focado
- [middleware.ts](C:/Projetos/Tanque%20Aberto/middleware.ts)
- [lib/beta/gate.ts](C:/Projetos/Tanque%20Aberto/lib/beta/gate.ts)
- [app/layout.tsx](C:/Projetos/Tanque%20Aberto/app/layout.tsx)
- [app/api/telemetry/route.ts](C:/Projetos/Tanque%20Aberto/app/api/telemetry/route.ts)
- [app/beta/page.tsx](C:/Projetos/Tanque%20Aberto/app/beta/page.tsx)
- [app/enviar/page.tsx](C:/Projetos/Tanque%20Aberto/app/enviar/page.tsx)
- [app/hub/page.tsx](C:/Projetos/Tanque%20Aberto/app/hub/page.tsx)
- [app/feedback/page.tsx](C:/Projetos/Tanque%20Aberto/app/feedback/page.tsx)
- [app/admin/layout.tsx](C:/Projetos/Tanque%20Aberto/app/admin/layout.tsx)

## Validacao
- `npm run typecheck` passou.
- `npm run build` passou.
- `npm run verify` passou.
- Os warnings de hooks em `price-submit-form.tsx`, `home-browser.tsx` e `retention-hub.tsx` continuam os mesmos e nao vieram desta passada.

## Estado Final
A politica de acesso agora esta coerente com o produto: leitura publica continua aberta, sessao local continua sem login, beta fechado usa convite/cookie persistente, e admin fica isolado por autenticacao forte.
