# Estado da Nação - Governança Final do Topo

## Resumo
O topo do Bomba Aberta foi reorganizado para funcionar como um sistema orquestrado, e não como uma sequência de chips competindo entre si.

A ordem de leitura agora é:
1. Busca
2. Estado do sistema
3. Recorte territorial
4. Modo de leitura
5. Missão

## O Que Foi Feito

### Busca como prioridade
- A busca continua no primeiro eixo visual do topo.
- Em estado sticky, ela permanece em destaque e recebe a maior área útil.
- Foi adicionado rastreio de foco na busca para medir intenção de uso.

### Estado do sistema consolidado
- [components/layout/top-orchestrator.tsx](C:/Projetos/Tanque%20Aberto/components/layout/top-orchestrator.tsx) agora sintetiza GPS, snapshot e leitura de rede em um único bloco de status.
- `GPS ativo` e `Snapshot offline` deixaram de disputar espaço como badges independentes.
- Quando ambos estão ativos, a leitura vira um único cartão com título e detalhe, reduzindo ruído visual.

### Recorte territorial separado, mas leve
- O recorte continua visível, porém em uma linha própria e mais compacta.
- O chip de cidade funciona como resumo territorial, não como mais um badge competindo com o sistema.

### Modo de leitura mais contido
- O seletor de densidade continua acessível, mas em versões sticky e micro ele perde peso visual.
- Isso reduz a altura ocupada no scroll intermediário sem tirar o controle do usuário.

### Missão preservada
- A missão segue explícita quando ativa.
- Em vez de disputar com o sistema, ela aparece como um destaque separado e curto.

## Variantes

### Expandida
- Busca ampla.
- Estado do sistema em bloco legível.
- Recorte territorial em linha própria.
- Densidade completa.

### Sticky
- Padding e altura reduzidos.
- Estado do sistema vira um cartão compacto.
- Densidade continua disponível, mas com leitura mais enxuta.
- O topo ocupa menos altura no scroll intermediário.

### Micro
- Topo ainda legível, porém mais curto.
- Estado do sistema e recorte permanecem presentes em formato condensado.
- A leitura fica mais rápida sem esconder o que é crítico.

## Medição Instalada
- `top_search_focused` quando a busca recebe foco.
- `top_sticky_enter` quando o topo entra em sticky.
- `top_sticky_exit` com `dwellMs` para medir permanência no estado sticky.

Esses eventos complementam as métricas já existentes de scroll e modo de leitura.

## Arquivo Principal
- [components/layout/top-orchestrator.tsx](C:/Projetos/Tanque%20Aberto/components/layout/top-orchestrator.tsx)

## Validação
- `npm run typecheck` passou.
- `npm run build` passou.
- Restam apenas warnings antigos de hooks e o aviso conhecido do `/hub` com uso dinâmico de cookies.

## Pendências
- Se você quiser uma próxima passada, o próximo ajuste natural é refinar ainda mais o estado sticky da home para reduzir o gap entre o topo e o primeiro card quando a missão está ativa.

