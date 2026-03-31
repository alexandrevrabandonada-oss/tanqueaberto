# Estado da Nacao - Orçamento Final do Sticky

Data: 2026-03-25
Projeto: Bomba Aberta

## Objetivo
Reduzir a altura útil consumida pelo topo fixo, especialmente em desktop largo e PWA wide, sem perder leitura imediata do estado do app.

## O que foi endurecido
- O `TopOrchestrator` passou a operar com budgets explícitos para `expanded`, `sticky` e `micro`.
- O estado `micro` entra mais cedo em desktop largo.
- O gatilho de micro também coopera com missão ativa para reduzir altura antes.
- `GPS ativo` e `Snapshot offline` foram compactados em chips mais curtos e mais disciplinados.
- A busca continua sempre visível e com menos folga vertical.
- Os chips de cidade ficaram mais curtos e o número de itens visíveis foi reduzido em modo compacto.
- A densidade visual do topo foi puxada para baixo em `lg/xl`, com menos padding e menos concorrência entre estados.

## Arquivos principais
- [components/layout/top-orchestrator.tsx](C:/Projetos/Tanque%20Aberto/components/layout/top-orchestrator.tsx)
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)

## Orçamento de altura
Os budgets ficaram explícitos no componente:

- `expanded`: `168px` normal, `152px` wide
- `sticky`: `112px` normal, `100px` wide
- `micro`: `84px` normal, `72px` wide

Leitura prática:
- `expanded` continua legível para primeira visão e retorno ao topo.
- `sticky` já é a superfície dominante no scroll e deve ser curta.
- `micro` é o estado de uso principal em desktop largo e PWA wide depois do recuo inicial.

## Regras finais
- A busca nunca perde prioridade.
- `GPS ativo`, `Snapshot offline`, densidade e filtros não podem disputar a mesma linha como blocos grandes.
- Em estados com missão ativa, o topo encolhe mais cedo.
- Em tela larga, o conteúdo principal ganha prioridade visual e o topo para de se comportar como cenário.

## Validação técnica
- `npm run build` passou.
- Persistem warnings antigos de hooks no projeto, mas nada novo bloqueante deste ajuste.

## Comparação de alturas por estado
### Antes
- `expanded` e `sticky` ainda pareciam mais altos do que o necessário em desktop.
- `micro` entrava tarde demais em telas largas.
- Os chips de sistema e densidade competiam por largura.

### Depois
- O topo fica mais baixo em sticky.
- O micro entra mais cedo em desktop wide.
- Os chips críticos passam a usar rótulos mais curtos e menos altura.
- A faixa secundária foi reduzida para não sobrepor leitura de mapa/lista.

## Screenshots
Não consegui gerar uma nova rodada local de screenshots neste sandbox porque o runtime do Next encerra com `spawn EPERM` ao tentar subir `next dev` / `next start`.

Referências visuais anteriores que cobrem a área do trabalho:
- [reports/layout-largo-intencional](C:/Projetos/Tanque%20Aberto/reports/layout-largo-intencional)
- [reports/hub-largo-5-0](C:/Projetos/Tanque%20Aberto/reports/hub-largo-5-0)
- [reports/cta-global-final](C:/Projetos/Tanque%20Aberto/reports/cta-global-final)

## Conclusão
O topo agora está mais próximo de uma ferramenta compacta do que de um bloco cenográfico. A leitura de mapa e lista ganhou prioridade, e o estado fixo passou a ocupar menos espaço útil em desktop largo e PWA wide.

## Pendência
Gerar screenshots dos modos `expanded`, `sticky` e `micro` em um ambiente que permita o runtime do Next sem `spawn EPERM`.
