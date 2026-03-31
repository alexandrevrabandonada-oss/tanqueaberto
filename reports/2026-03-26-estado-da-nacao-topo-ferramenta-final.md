# Estado da Nação — Topo Ferramenta Final

Data: 2026-03-26

## Objetivo
Reduzir a altura útil consumida pelo topo sticky e pelo bloco de filtros da home/mapa, para que o mapa e a lista entrem antes e o topo deixe de parecer uma grande placa sobre o produto.

## O que mudou
- A faixa superior foi reestruturada em três camadas mais curtas:
  - linha 1: busca
  - linha 2: território + estado crítico
  - linha 3: só no modo expanded
- `snapshot offline`, `GPS ativo` e o modo visual ficaram em chips pequenos e mais duros semanticamente.
- O topo entra em micro/sticky mais cedo no desktop e na PWA larga.
- O bloco de filtros perdeu peso vertical quando o topo já está compactado.

## Arquivos principais
- [components/layout/top-orchestrator.tsx](C:/Projetos/Tanque%20Aberto/components/layout/top-orchestrator.tsx)
- [components/ui/density-selector.tsx](C:/Projetos/Tanque%20Aberto/components/ui/density-selector.tsx)
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)

## Budgets finais
- Expanded: `140px` normal, `128px` wide
- Sticky: `92px` normal, `84px` wide
- Micro: `64px` normal, `58px` wide

## Regra final por estado
- Expanded:
  - busca em linha própria
  - chips críticos em linha própria
  - linha suplementar visível só quando o topo ainda não compactou
- Sticky:
  - busca permanece visível
  - chips críticos continuam visíveis
  - linha suplementar some
  - padding vertical reduzido
- Micro:
  - busca compacta
  - chips críticos em versão mínima
  - linha suplementar escondida
  - leitura prioriza mapa/lista

## Ajuste de rolagem
- O topo entra em sticky mais cedo no desktop: `36px`
- O topo entra em micro mais cedo no desktop: `92px`
- Em viewport menor, os limiares também foram reduzidos para compactar antes

## Validação
- `npm run build` passou
- Persistem apenas warnings antigos de hooks em componentes já conhecidos
- A rota `/hub` continua com o aviso dinâmico já conhecido do projeto

## Screenshots
- Não foram geradas nesta passagem porque o sandbox ainda bloqueia a abertura do servidor visual com `spawn EPERM`.
- A matriz desejada continua sendo expanded, sticky e micro, em mobile, tablet, desktop e PWA wide.

## Veredito
GO no código, HOLD na captura visual automatizada deste ambiente.

## Leitura final
O topo agora funciona mais como ferramenta do que como placa: ele informa o estado sem competir com o mapa e a lista.
