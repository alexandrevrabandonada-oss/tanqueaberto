# Estado da Nacao: desglobalizacao do estado client

Data: 2026-03-30

## Resumo executivo

A passada removeu estado operacional client do caminho global do app, mas nao derrubou o teto de `shared JS global`, que continua em `103 kB`.

O ganho real foi arquitetural:

- `MissionProvider` saiu do root em [app/layout.tsx](C:/Projetos/Tanque%20Aberto/app/layout.tsx)
- sinais de runtime de missao passaram a ser carregados por rota em [components/layout/route-runtime-signals.tsx](C:/Projetos/Tanque%20Aberto/components/layout/route-runtime-signals.tsx)
- o strip PWA deixou de importar estado de missao e foco operacional em [components/pwa/pwa-status-strip.tsx](C:/Projetos/Tanque%20Aberto/components/pwa/pwa-status-strip.tsx)
- home, hub e enviar passaram a pagar por `MissionProvider` apenas onde realmente usam isso:
  - [app/page.tsx](C:/Projetos/Tanque%20Aberto/app/page.tsx)
  - [app/hub/page.tsx](C:/Projetos/Tanque%20Aberto/app/hub/page.tsx)
  - [app/enviar/page.tsx](C:/Projetos/Tanque%20Aberto/app/enviar/page.tsx)

Conclusao objetiva:

- a desglobalizacao funcionou no desenho do estado client
- o gargalo residual de `103 kB` nao era mais esse estado operacional compartilhado
- o teto agora ficou concentrado principalmente em runtime/vendor compartilhado do Next e em hooks client ainda quentes por rota

## O que estava globalizado demais

### 1. MissionProvider no root

Antes, a arvore inteira passava por `MissionProvider` no layout raiz. Isso fazia qualquer rota publica simples carregar estrutura de missao mesmo sem precisar dela.

Acao tomada:

- removido do root em [app/layout.tsx](C:/Projetos/Tanque%20Aberto/app/layout.tsx)
- reintroduzido apenas nas rotas que realmente usam missao e continuidade:
  - [app/page.tsx](C:/Projetos/Tanque%20Aberto/app/page.tsx)
  - [app/hub/page.tsx](C:/Projetos/Tanque%20Aberto/app/hub/page.tsx)
  - [app/enviar/page.tsx](C:/Projetos/Tanque%20Aberto/app/enviar/page.tsx)

### 2. Runtime signals misturados ao shell global

`MissionOverlay` e outros sinais de runtime ainda podiam contaminar o shell inicial.

Acao tomada:

- isolado em [components/layout/route-runtime-signals.tsx](C:/Projetos/Tanque%20Aberto/components/layout/route-runtime-signals.tsx)
- carregamento diferido por `requestIdleCallback` ou primeira interacao

### 3. PWA strip puxando estado operacional

O banner PWA ainda importava:

- `useMissionContext`
- `useOperationalFocus`

Isso arrastava estado client compartilhado para o chrome da aplicacao.

Acao tomada:

- `components/pwa/pwa-status-strip.tsx` foi simplificado para atuar apenas com:
  - install prompt
  - update ready
  - online/offline
  - poor connection
- saiu a dependencia de missao e foco operacional

## O que foi encontrado na medicao

### Baseline desta frente

Antes desta passada de desglobalizacao, o ultimo baseline estavel era:

- shared JS global: `103 kB`
- `/`: `19.2 kB` route size, `158 kB` first load
- `/enviar`: `1.87 kB`, `132 kB`
- `/hub`: aproximadamente `15.6 kB`, `152 kB`

### Resultado final apos a desglobalizacao

Build final:

- shared JS global: `103 kB`
- `/`: `20.8 kB`, `159 kB`
- `/enviar`: `1.51 kB`, `133 kB`
- `/hub`: `15.4 kB`, `153 kB`
- `/atualizacoes`: `6.96 kB`, `132 kB`
- `/postos/[id]`: `5.18 kB`, `130 kB`

### Leitura correta dos numeros

1. O `shared JS global` nao caiu.
2. O caminho de envio ficou estruturalmente mais enxuto por rota.
3. Home e hub nao tiveram ganho material no `first load`.
4. O que foi removido do global reapareceu como custo local de rota, que era exatamente a intencao arquitetural.

## Confirmacao tecnica do que saiu do shared quente

Foi feita busca direta nos chunks gerados em `.next/static/chunks`.

O resultado final mostrou que os chunks globais mais pesados:

- `1255-aadf393aa3a56bfa.js` com `46 kB`
- `4bd1b696-f785427dddbba9fb.js` com `54.2 kB`

nao continham mais referencias diretas a:

- `MissionProvider`
- `useOperationalFocus`
- `useMySubmissions`
- `useProgressiveIdentity`
- sinais operacionais locais equivalentes

Essas referencias passaram a aparecer num chunk de rota:

- `5979-dc2281eecba54a5f.js`

Conclusao:

- o estado operacional client saiu do shared quente
- o shared de `103 kB` persistiu por outros motivos

## Patch aplicado

### Arquivos principais

- [app/layout.tsx](C:/Projetos/Tanque%20Aberto/app/layout.tsx)
- [app/page.tsx](C:/Projetos/Tanque%20Aberto/app/page.tsx)
- [app/hub/page.tsx](C:/Projetos/Tanque%20Aberto/app/hub/page.tsx)
- [app/enviar/page.tsx](C:/Projetos/Tanque%20Aberto/app/enviar/page.tsx)
- [components/layout/route-runtime-signals.tsx](C:/Projetos/Tanque%20Aberto/components/layout/route-runtime-signals.tsx)
- [components/pwa/pwa-status-strip.tsx](C:/Projetos/Tanque%20Aberto/components/pwa/pwa-status-strip.tsx)

### Mudancas objetivas

- root voltou a ser mais fino
- missao deixou de ser provider global
- sinais de runtime deixaram de nascer no app inteiro
- o strip PWA deixou de puxar missao e foco operacional

## O que contribuiu mais para o shared quente

Depois dessa passada, a resposta ficou mais clara:

### Nao era mais

- `MissionProvider`
- `useMission`
- `useMySubmissions`
- `useOperationalFocus`
- identidade progressiva no shell

### Passou a ser principalmente

- runtime/vendor compartilhado do Next
- infraestrutura client comum entre rotas
- parte do stack de navegacao e shell deferido

## Resultado final

### Sucesso

- desglobalizacao arquitetural concluida
- rotas publicas simples nao pagam mais por estado operacional global sem necessidade
- validacao completa passou

### Limite encontrado

- o teto de `shared JS global` nao caiu com essa passada
- isso prova que o proximo corte precisa mirar vendor/runtime compartilhado ou quebrar mais o client state ainda quente por rota

## Validacao

- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou

## Proximo alvo tecnico natural

Se a meta continuar sendo derrubar o `shared JS global`, o proximo foco nao deve ser mais `MissionProvider` nem `PwaStatusStrip`.

Os candidatos mais provaveis agora sao:

1. shell/client helpers ainda compartilhados por varias rotas
2. infra de navegacao e wrappers client comuns
3. vendor/runtime que esta estabilizado no teto de `103 kB`
