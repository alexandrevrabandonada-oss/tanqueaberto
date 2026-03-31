# Estado da Nacao - Topo Sticky v2

## Contexto

A passada dura focou a rota `/` do Bomba Aberta para tirar peso do topo sticky sem remover a funcao de exploracao. O objetivo foi fazer o topo entrar como ferramenta: buscar, orientar e preservar o minimo de estado territorial, sem continuar roubando viewport do mapa e da lista.

## Auditoria

Trechos auditados:

- `components/layout/top-orchestrator.tsx`
- `components/home/home-browser.tsx`
- comportamento sticky do mapa via `TopOrchestrator`
- comportamento sticky da lista via `isHeroCollapsed` e `isMicroMode`
- mobile, desktop e PWA wide

Pontos encontrados antes do ajuste:

- O sticky ainda carregava duas linhas com bastante densidade visual.
- O painel de filtros podia crescer e manter o topo mais alto do que o necessario.
- O topo ainda usava um fundo escuro muito presente no sticky.
- No scroll, a home demorava um pouco demais para liberar mapa e lista no viewport, especialmente no mobile.

## O que mudou

### Topo sticky

- Reduzi os budgets declarados em `TOP_BUDGETS`.
- O sticky passou a usar fundo mais leve e menos ornamental.
- O painel avançado fecha automaticamente quando o topo entra em sticky.
- O toggle de filtros deixa de aparecer no estado sticky, reduzindo redundancia e altura.
- Os chips de territorio e sistema ficam em uma faixa horizontal com overflow, em vez de forcar mais altura.
- Os chips compactos ficaram mais baixos.

### Home e scroll

- Antecipei o colapso do hero e o micro-sticky no scroll.
- A lista e o mapa entram mais cedo em foco porque o topo libera viewport antes.

### Nao alterado

- Nenhuma mudanca em `admin`.
- Nenhuma mudanca em `beta`.
- Nenhuma mudanca de CTA governance alem do necessario para manter a home coerente.

## Antes e Depois por breakpoint

| Breakpoint | Antes | Depois |
| --- | --- | --- |
| Mobile | Sticky ainda vinha pesado, com faixa mais alta e filtros competindo com leitura util. O hero demorava mais para ceder espaco. | Sticky cai para 56px de budget, a faixa fica mais discreta, sem toggle de filtros no estado fixo, e a home libera o mapa/lista mais cedo. |
| Desktop | O topo fixo continuava com mais massa visual do que o necessario e ainda permitia expandir mais estados na mesma area. | Sticky segue curto, com fundo menos chamativo, chips em linha e sem painel avancado no estado fixo. |
| PWA wide | A largura extra ainda era consumida por um sticky visualmente pesado demais para a exploracao. | O estado wide preserva busca e territorio, mas reduz o volume vertical e evita a faixa escura ornamental. |

## Valores finais

- `expanded`: 104px / 94px wide
- `compact`: 84px / 74px wide
- `sticky`: 56px / 48px wide
- `micro`: 40px / 36px wide

Scroll thresholds atuais:

- `collapseThreshold`: 12 desktop / 56 mobile
- `microThreshold`: 28 desktop / 160 mobile

## Validacao

Comandos executados:

- `npm run typecheck`
- `npm run build`
- `npm run verify`

Resultado:

- `build`: passou
- `typecheck`: passou apos a geracao de `.next/types` pelo build
- `verify`: passou na segunda rodada, com as mesmas warnings de hooks ja existentes no projeto

Warnings vistos no build/verificacao:

- `components/forms/price-submit-form.tsx`
- `components/home/home-browser.tsx`
- `components/layout/retention-hub.tsx`

Nao alterei essas areas.

## Arquivos tocados

- `components/layout/top-orchestrator.tsx`
- `components/home/home-browser.tsx`

## Leitura final

O topo agora se comporta mais como ferramenta de exploracao do que como barra de status. Ele preserva busca e o minimo de orientacao territorial, mas para de ocupar mais espaco do que precisa quando vira sticky. O mapa e a lista entram mais cedo na leitura util.
