# Estado da Nação: low-perf agressivo mobile

## Resumo executivo
O app ganhou um modo low-perf mais agressivo para aparelhos antigos, rede ruim e navegação PWA. A regra agora é simples: priorizar conteúdo e toque, e atrasar ou desligar o que pesa visualmente ou custa render.

## Critérios do modo
O modo entra quando um ou mais sinais aparecem:
- `effectiveType` em `slow-2g`, `2g` ou `3g`
- `saveData` ativo
- `deviceMemory` baixo
- `hardwareConcurrency` baixo
- `prefers-reduced-motion`

## O que foi reduzido
- blur pesado
- sombras e brilhos decorativos
- animações não essenciais
- pulse/spin/bounce/entradas animadas
- overlays visuais grandes
- montagem imediata do mapa em superfícies de baixo desempenho

## O que foi priorizado
- lista e conteúdo textual antes de superfícies pesadas
- mapa leve com montagem adiada quando necessário
- shell com menos ornamento em mobile fraco
- navegação e toque sem competir com efeitos visuais

## Patch aplicado
- [`hooks/use-network-hardening.ts`](C:/Projetos/Tanque%20Aberto/hooks/use-network-hardening.ts)
- [`components/layout/performance-mode-sync.tsx`](C:/Projetos/Tanque%20Aberto/components/layout/performance-mode-sync.tsx)
- [`components/map/station-map-shell.tsx`](C:/Projetos/Tanque%20Aberto/components/map/station-map-shell.tsx)
- [`components/layout/app-shell.tsx`](C:/Projetos/Tanque%20Aberto/components/layout/app-shell.tsx)
- [`app/globals.css`](C:/Projetos/Tanque%20Aberto/app/globals.css)
- [`lib/telemetry/types.ts`](C:/Projetos/Tanque%20Aberto/lib/telemetry/types.ts)

## Boundary corrigida
O build estava quebrando na prerenderização de [`app/offline/page.tsx`](C:/Projetos/Tanque%20Aberto/app/offline/page.tsx) porque o fluxo de shell carregava leitura de ambiente de navegador cedo demais em SSR. A leitura foi blindada em [`hooks/use-network-hardening.ts`](C:/Projetos/Tanque%20Aberto/hooks/use-network-hardening.ts) para não depender de `window` fora do browser.

## Métrica/telemetria
Eventos adicionados:
- `performance_mode_detected`
- `low_perf_map_mounted`

## Validação
- `npm run typecheck` passou
- `npm run build` passou
- `npm run verify` passou

## Risco residual
- warnings antigos de hooks em `components/layout/retention-hub.tsx`
- warnings de cache do Next continuam no build, mas não impedem o release
