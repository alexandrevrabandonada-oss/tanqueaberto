# Estado da Nação: fix `useTestMode` server boundary

## Resumo executivo

A rota `/postos/sem-atualizacao` estava quebrando porque o componente `StationCard` consumia `useTestMode()` sem estar marcado como Client Component.

Em Next.js, isso faz o compilador tratar a árvore como server-side até encontrar o hook client, o que gera a quebra de boundary em runtime.

## Causa raiz

- `app/postos/sem-atualizacao/page.tsx` renderiza uma lista de `StationCard`.
- `components/station/station-card.tsx` usava `useTestMode()` e `useRef`, mas não tinha `"use client"`.
- A rota server acabava atravessando uma fronteira de client hook indevida.

## Correção aplicada

- Adicionei `"use client"` em [components/station/station-card.tsx](C:/Projetos/Tanque%20Aberto/components/station/station-card.tsx).
- Não mexi na rota server além disso; a página continua SSR.
- A lógica de teste continua client-side, onde pertence.

## Diff focado

- [components/station/station-card.tsx](C:/Projetos/Tanque%20Aberto/components/station/station-card.tsx)

## Validação

Executado com sucesso:
- `npm run build`
- `npm run typecheck`
- `npm run verify`
- Smoke local de SSR em `/postos/sem-atualizacao` com HTTP `200`

## Resultado prático

- `/postos/sem-atualizacao` abre normalmente em SSR.
- O erro de boundary server/client não reaparece.
- O servidor não repete o stack de `useTestMode()` para essa rota.
