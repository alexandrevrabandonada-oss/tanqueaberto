# Estado da Nacao: vendor runtime final

Data: 2026-03-30

## Resumo executivo

A auditoria final mostrou que o `shared JS global` de `103 kB` nao estava mais sendo sustentado por estado operacional do app.

Ele esta concentrado principalmente em dois blocos:

- `1255-aadf393aa3a56bfa.js` com `46 kB`
- `4bd1b696-f785427dddbba9fb.js` com `54.2 kB`

O que eles carregam de verdade:

- runtime de hidratacao do App Router
- navegacao client do Next
- infraestrutura de RSC e server actions
- React DOM runtime e reconciler client

Conclusao objetiva:

- houve espaco para micro-cortes em rotas e infra compartilhada do app
- nao houve queda do teto de `103 kB`
- o gargalo residual agora esta majoritariamente no runtime compartilhado do framework, nao em `MissionProvider`, foco operacional ou chrome visual

## Diagnostico curto dos modulos que compoem o shared quente

### Chunk `1255...` (`46 kB`)

As buscas nos artefatos gerados mostraram sinais claros de App Router e RSC, incluindo:

- `RedirectBoundary`
- `LayoutRouterContext`
- `dispatchAppRouterAction`
- `createRouterCacheKey`
- `callServer`
- `createFromReadableStream`

Leitura correta:

- esse bloco concentra a infraestrutura de navegacao client do App Router
- ele nao estava mais carregando os hooks operacionais que ja foram desglobalizados

### Chunk `4bd1...` (`54.2 kB`)

As buscas mostraram sinais de runtime React/ReactDOM e hidratacao, incluindo:

- `hydrateRoot`
- `createRoot`
- reconciler do React DOM
- tratamento de eventos do runtime

Leitura correta:

- esse bloco e predominantemente vendor/runtime
- ele nao caiu com a limpeza do app porque nao era o estado operacional que estava sustentando esse peso

## O que ainda era compartilhado do app inteiro

O que restava como infra comum e podia ser atacado sem reabrir arquitetura:

- imports extensos de `lucide-react`
- badge da VR Abandonada como Client Component no shell
- chrome client diferido ainda comum a varias rotas

## Patch aplicado

### 1. Otimizacao automatica de imports de pacote

Arquivo:

- [next.config.ts](C:/Projetos/Tanque%20Aberto/next.config.ts)

Mudanca:

- ativado `experimental.optimizePackageImports` para:
  - `lucide-react`
  - `date-fns`

Objetivo:

- evitar custo de imports agregados de biblioteca em multiplas superficies client
- reduzir route chunks e shared intermediario onde o bundler conseguir quebrar melhor os modulos

### 2. Badge de marca saindo do client desnecessario

Arquivo:

- [components/brand/vr-abandonada-badge.tsx](C:/Projetos/Tanque%20Aberto/components/brand/vr-abandonada-badge.tsx)

Mudanca:

- removeu `use client`

Objetivo:

- impedir que esse badge do shell arraste JS client sem necessidade
- deixar o shell mais server-first

## Antes / depois com numeros

### Baseline antes desta passada

- shared JS global: `103 kB`
- `/`: `20.8 kB` / `159 kB`
- `/enviar`: `1.51 kB` / `133 kB`
- `/hub`: `15.4 kB` / `153 kB`
- `/atualizacoes`: `6.96 kB` / `132 kB`
- `/postos/[id]`: `5.18 kB` / `130 kB`

### Resultado final

- shared JS global: `103 kB`
- `/`: `20.6 kB` / `158 kB`
- `/enviar`: `1.19 kB` / `132 kB`
- `/hub`: `15.1 kB` / `153 kB`
- `/atualizacoes`: `6.89 kB` / `131 kB`
- `/postos/[id]`: `4.64 kB` / `129 kB`

## Leitura correta do antes/depois

### O que melhorou

- a home caiu `1 kB` de first load e `0.2 kB` de route size
- `/enviar` caiu `1 kB` de first load e `0.32 kB` de route size
- `/atualizacoes` caiu `1 kB` de first load
- `/postos/[id]` caiu `1 kB` de first load e `0.54 kB` de route size

### O que nao mudou

- o `shared JS global` ficou em `103 kB`

### O que isso prova

- havia gordura pequena em infra compartilhada do app
- o teto principal nao esta mais em wrappers do produto
- o proximo corte relevante exigiria atacar limites do runtime compartilhado do Next/React ou aceitar que esse valor ja esta proximo do piso desta arquitetura

## Impacto por area

### Home

- ligeiramente mais leve no frio
- sem regressao de UX

### Enviar

- rota principal seguiu caindo no caminho frio
- sem reabrir fluxo guiado

### Shell

- badge de marca deixou de ser client sem necessidade
- ganho pequeno, mas estruturalmente correto

## Conclusao final

A auditoria final respondeu a pergunta certa:

- o shared quente nao estava mais sendo sustentado pelo estado client do produto
- ele esta majoritariamente em runtime compartilhado do framework
- ainda havia pequenos cortes possiveis em imports e componentes client desnecessarios, e eles foram feitos
- o teto de `103 kB` permaneceu

Se a meta continuar sendo derrubar esse shared, o proximo passo nao e mais micro-otimizacao de home/hub/enviar. O proximo passo seria uma decisao mais funda sobre o piso aceitavel do App Router client runtime nesta aplicacao.

## Validacao

- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou
