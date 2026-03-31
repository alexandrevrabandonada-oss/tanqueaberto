# Estado da Nação: cadastro e semeadura de postos

## Diagnóstico curto
- O Bomba Aberta não tinha um fluxo dedicado para pessoas de confianca cadastrarem postos que ainda nao existem na lista.
- O admin total era amplo demais para essa tarefa e aumentava o risco operacional.
- A semeadura precisava ser mobile-first, curta e com prevencao de duplicidade na entrada.

## O que entrou
- Papel restrito `station_editor` em `lib/auth/admin.ts`.
- Login com redirecionamento por papel em `components/admin/admin-login-form.tsx` e `app/admin/login/page.tsx`.
- Rota restrita de cadastro em `app/postos/cadastrar/page.tsx`.
- Fluxo de cadastro rapido em `components/stations/station-seed-form.tsx`.
- Action de criacao e curadoria em `app/postos/cadastrar/actions.ts`.
- Tabela de auditoria para semeadura em `supabase/migrations/20260330_023_station_editor_roles.sql`.
- Link operacional para a semeadura no painel admin em `app/admin/page.tsx`.

## Antes / Depois
- Antes: cadastro novo dependia de fluxos amplos ou pouco claros.
- Depois: existe um papel estreito, com acesso apenas ao cadastro e edicao leve de postos.

- Antes: o usuario precisava de muito contexto para criar um posto novo.
- Depois: o fluxo abre com 4 blocos simples, focando GPS, ajuste do local, apelido e campos leves.

- Antes: a duplicidade aparecia tarde.
- Depois: o fluxo mostra ate 3 parecidos/proximos antes de salvar, com saida clara para escolher um existente.

- Antes: o status de saida nao separava bem posto pronto de posto em revisao.
- Depois: o servidor marca como ativo quando ha sinal forte e manda para revisao quando falta confianca.

## Operacao
- A curadoria territorial continua recebendo o posto novo.
- O admin total segue isolado do papel estreito.
- A trilha de auditoria registra criador, contexto e duplicidade percebida.

## Validacao
- `npm run typecheck` passou.
- `npm run build` passou.
- `npm run verify` passou.

## Números
- A rota nova `/postos/cadastrar` ficou com `7.62 kB` de tamanho de rota e `122 kB` de First Load JS.
- O admin login ficou em `1.63 kB` de tamanho de rota e `121 kB` de First Load JS.
