# Estado da Nação - Topo Sticky Compacto Desktop

Data: 2026-03-27

## Objetivo
Reduzir a ocupacao vertical do topo sticky no desktop largo sem quebrar busca, filtros essenciais ou a identidade visual atual.

## Budgets adotados
- `expanded`: 112px / 100px wide
- `compact`: 92px / 80px wide
- `sticky`: 68px / 60px wide
- `micro`: 48px / 42px wide

Referencias:
- [components/layout/top-orchestrator.tsx](C:/Projetos/Tanque%20Aberto/components/layout/top-orchestrator.tsx#L12)
- [components/layout/top-orchestrator.tsx](C:/Projetos/Tanque%20Aberto/components/layout/top-orchestrator.tsx#L175)
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx#L236)

## O que entrou
- Desktop `>= 1280` entra em modo compacto no `TopOrchestrator` por default.
- O topo continua mostrando busca, território e GPS como superfícies primarias.
- O botão de filtros secundários permanece acessivel no desktop largo.
- O painel secundario pode colapsar e reabrir sem forcar o bloco inteiro a crescer.
- O micro-sticky continua sendo acionado ao scroll, com thresholds mais curtos no wide desktop.
- O modo compacto tem budget proprio, separado do sticky e do micro.

## Antes / Depois por rota
### `/`
- Antes: o topo tendia a ocupar mais altura util acima da dobra no desktop largo.
- Depois: o topo nasce compacto em `>= 1280`, reduz a leitura secundaria e chega ao micro mais cedo no scroll.

### `/atualizacoes`
- Auditada nesta passada como referencia de validação.
- Sem mudanca estrutural neste pacote.
- O topo da pagina continua sem placa sticky propria.

### `/enviar`
- Auditada nesta passada como referencia de validação.
- Sem mudanca estrutural neste pacote.
- O fluxo principal segue acionavel sem competir com um topo pesado.

### `/hub`
- Auditada nesta passada como referencia de validação.
- Sem mudanca estrutural neste pacote.
- O centro de continuidade permanece focado no conteudo do hub, sem inflar o shell.

## Diff focado
Arquivos tocados neste pacote:
- [components/layout/top-orchestrator.tsx](C:/Projetos/Tanque%20Aberto/components/layout/top-orchestrator.tsx)
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)

### Resumo do diff
- `components/layout/top-orchestrator.tsx`: adiciona budget `compact`, compacta o topo em desktop largo, preserva busca e filtros essenciais e mantém a entrada de filtros secundarios via toggle.
- `components/home/home-browser.tsx`: antecipa a virada para compact/micro no scroll em desktop largo, para liberar mais area util do mapa/lista/feed.

## Checklist visual
- [x] Search continua visivel
- [x] Territorio/GPS continuam visiveis
- [x] Filtros secundarios podem colapsar
- [x] Desktop `>= 1280` entra em compacto
- [x] Micro-sticky reduz ainda mais a altura
- [x] Mobile/tablet preservados
- [x] Wide desktop ganha area util acima da dobra

## Validacao
- `npm run typecheck`: passou
- `npm run build`: passou
- `npm run verify`: passou

## Estado da Nacao
O topo deixou de se comportar como placa constante e passou a operar como camada de decisao com budget real no desktop largo.
