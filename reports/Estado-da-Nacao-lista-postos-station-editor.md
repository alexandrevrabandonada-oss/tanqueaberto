# Estado da Nacao - lista de postos para station_editor

## Diagnostico curto

O papel `station_editor` estava restrito a dois fluxos estreitos: aceitar convite leve e semear posto novo em `/postos/cadastrar`. Faltava a porta operacional para navegar na base ja existente, localizar um posto, revisar seu estado e entrar na edicao leve sem conceder acesso ao admin amplo.

O patch fecha essa lacuna com uma rota propria em `/postos`, leitura operacional da base completa via sessao restrita, filtros simples, indicadores de status e retorno consistente para a lista durante a edicao.

## Patch completo

### Nova rota restrita

- Criada a rota [app/postos/page.tsx](/C:/Projetos/Tanque%20Aberto/app/postos/page.tsx).
- A pagina exige `requireStationEditorUser()`.
- A lista funciona como entrada principal do papel `station_editor`.
- O login e o aceite do convite agora aterrissam em `/postos`, nao mais direto em `/postos/cadastrar`.

### Leitura operacional da base existente

- Criado o agregador [lib/ops/station-editor-station-list.ts](/C:/Projetos/Tanque%20Aberto/lib/ops/station-editor-station-list.ts).
- A leitura usa `createSupabaseServiceClient()` para permitir que a sessao leve enxergue estados operacionais que o cliente anonimo nao resolveria bem.
- Cada item expoe:
  - nome publico/apelido
  - bandeira
  - bairro
  - cidade
  - status operacional
  - ultimo preco aprovado ou ausencia de preco recente
  - suspeita de duplicidade territorial

### Busca e filtros

- Busca por nome/apelido com `q`.
- Filtros simples por `city`, `neighborhood` e `brand`.
- Filtro de preco:
  - `all`
  - `recent`
  - `without_recent`
- Filtro de revisao:
  - `all`
  - `review`

### Acoes por item

- `Ver posto` abre [app/postos/[id]/page.tsx](/C:/Projetos/Tanque%20Aberto/app/postos/[id]/page.tsx).
- `Editar leve` entra em [app/postos/[id]/editar/page.tsx](/C:/Projetos/Tanque%20Aberto/app/postos/[id]/editar/page.tsx).
- Quando houver parecidos territoriais, a UI destaca a suspeita e expoe a acao `Marcar duplicidade`, que abre a edicao leve em modo duplicidade com o melhor candidato priorizado.

### Fluxo de retorno e navegacao

- [app/postos/[id]/editar/actions.ts](/C:/Projetos/Tanque%20Aberto/app/postos/[id]/editar/actions.ts) agora preserva `returnTo` em erros e sucessos e rejeita vinculacao de duplicado fora da lista sugerida.
- [app/postos/[id]/editar/page.tsx](/C:/Projetos/Tanque%20Aberto/app/postos/[id]/editar/page.tsx) ganhou volta segura para a lista filtrada.
- [components/stations/station-light-edit-form.tsx](/C:/Projetos/Tanque%20Aberto/components/stations/station-light-edit-form.tsx) ja carregava esse hidden field e passou a ser usado no fluxo real.

### Integracao com o papel station_editor

- [app/admin/login/page.tsx](/C:/Projetos/Tanque%20Aberto/app/admin/login/page.tsx) agora envia `station_editor` para `/postos`.
- [components/admin/admin-login-form.tsx](/C:/Projetos/Tanque%20Aberto/components/admin/admin-login-form.tsx) foi alinhado com a nova rota.
- [components/station/station-editor-invite-accept-form.tsx](/C:/Projetos/Tanque%20Aberto/components/station/station-editor-invite-accept-form.tsx) redireciona para `/postos?notice=invite_accepted`.
- [app/postos/cadastrar/page.tsx](/C:/Projetos/Tanque%20Aberto/app/postos/cadastrar/page.tsx) ganhou links de ida para a base existente, mantendo semeadura e navegacao lado a lado.

## Antes e depois

### Antes

- `station_editor` entrava basicamente em `/postos/cadastrar`.
- Nao havia lista completa de postos existentes para leitura operacional.
- Corrigir um posto existente dependia de conhecer o link ou de acesso mais amplo.
- O fluxo de edicao nao devolvia bem para uma lista filtrada.

### Depois

- `station_editor` entra em `/postos` como porta principal de operacao.
- A base existente pode ser navegada com busca e filtros simples.
- Cada posto exibe leitura rapida de nome, bandeira, bairro, cidade, status e ultimo preco.
- A edicao leve parte da lista e retorna para a lista filtrada.
- A suspeita de duplicidade aparece no contexto operacional sem abrir curadoria total.
- O atalho de duplicidade entra com contexto e sugestao de vinculacao, sem permitir ids arbitrarios.
- O papel continua estreito: sem admin amplo, sem curadoria total, sem ampliar privilegios fora do escopo operacional.

## Arquivos principais

- [app/postos/page.tsx](/C:/Projetos/Tanque%20Aberto/app/postos/page.tsx)
- [lib/ops/station-editor-station-list.ts](/C:/Projetos/Tanque%20Aberto/lib/ops/station-editor-station-list.ts)
- [app/postos/[id]/editar/page.tsx](/C:/Projetos/Tanque%20Aberto/app/postos/[id]/editar/page.tsx)
- [app/postos/[id]/editar/actions.ts](/C:/Projetos/Tanque%20Aberto/app/postos/[id]/editar/actions.ts)
- [app/postos/cadastrar/page.tsx](/C:/Projetos/Tanque%20Aberto/app/postos/cadastrar/page.tsx)
- [app/admin/login/page.tsx](/C:/Projetos/Tanque%20Aberto/app/admin/login/page.tsx)
- [components/admin/admin-login-form.tsx](/C:/Projetos/Tanque%20Aberto/components/admin/admin-login-form.tsx)
- [components/station/station-editor-invite-accept-form.tsx](/C:/Projetos/Tanque%20Aberto/components/station/station-editor-invite-accept-form.tsx)

## Validacao executada

Executado em 31/03/2026:

- `npm run build` ✅
- `npm run typecheck` ✅
- `npm run verify` ✅

Observacao:

- `npm run verify` passou com `build + typecheck + check:drift`.
- Os erros de `.next/types` vistos no meio da passada aconteceram quando `typecheck` disputou a arvore gerada em execucoes paralelas; na execucao final sequencial, o resultado ficou verde.
