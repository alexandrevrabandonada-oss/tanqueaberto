# Estado da Nação — Governança do Worktree

Data: 2026-03-26

## Resumo executivo

O worktree atual nao representa um unico pacote coeso. Ele mistura shell, CTA global, topo/sticky, home orquestrada, hub, curadoria territorial, scripts de release, testes de debug e varios artefatos de relatorio.

Isso aumenta o risco de o proximo preview ou deploy carregar dependencias cruzadas sem ficar claro qual fronteira foi realmente fechada.

## Inventario geral

- Modificados tracked: 19
- Untracked de produto/infra: 13
- Relatorios e capturas geradas: varios pacotes em `reports/`
- Limpeza pendente: arquivos removidos em `test-results/`

## Pacote 1: shell / CTA

Arquivos:
- [components/layout/app-shell.tsx](C:/Projetos/Tanque%20Aberto/components/layout/app-shell.tsx)
- [components/layout/bottom-nav.tsx](C:/Projetos/Tanque%20Aberto/components/layout/bottom-nav.tsx)
- [components/layout/global-submit-cta.tsx](C:/Projetos/Tanque%20Aberto/components/layout/global-submit-cta.tsx)
- [app/atualizacoes/page.tsx](C:/Projetos/Tanque%20Aberto/app/atualizacoes/page.tsx)
- [app/enviar/page.tsx](C:/Projetos/Tanque%20Aberto/app/enviar/page.tsx)

Risco:
- Medio-alto.
- Erros de z-index, safe area, eixo visual ou duplicacao de CTA aparecem em todas as telas.

Estado:
- Pronto para commit isolado, desde que nao seja misturado com os pacotes de topo e home.

## Pacote 2: topo / sticky

Arquivos:
- [components/layout/top-orchestrator.tsx](C:/Projetos/Tanque%20Aberto/components/layout/top-orchestrator.tsx)
- [components/ui/density-selector.tsx](C:/Projetos/Tanque%20Aberto/components/ui/density-selector.tsx)
- [components/ui/warm-start-badge.tsx](C:/Projetos/Tanque%20Aberto/components/ui/warm-start-badge.tsx)
- [components/mission/mission-overlay.tsx](C:/Projetos/Tanque%20Aberto/components/mission/mission-overlay.tsx)

Risco:
- Alto em desktop largo, medio em mobile.
- Pode parecer uma placa sobre o mapa se entrar junto com outras expansoes visuais.

Estado:
- Pronto para commit isolado, mas deve viajar com o pacote de home que o consome.

## Pacote 3: home orquestrada

Arquivos:
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)
- [lib/ui/home-orchestrator.ts](C:/Projetos/Tanque%20Aberto/lib/ui/home-orchestrator.ts)
- [components/layout/surface-orchestrator.tsx](C:/Projetos/Tanque%20Aberto/components/layout/surface-orchestrator.tsx)
- [components/station/station-card.tsx](C:/Projetos/Tanque%20Aberto/components/station/station-card.tsx)
- [lib/data/queries.ts](C:/Projetos/Tanque%20Aberto/lib/data/queries.ts)
- [lib/ops/release-control.ts](C:/Projetos/Tanque%20Aberto/lib/ops/release-control.ts)
- [lib/ops/scheduler.ts](C:/Projetos/Tanque%20Aberto/lib/ops/scheduler.ts)

Risco:
- Alto.
- Se misturar com shell e hub sem corte, a primeira dobra pode voltar a competir com si mesma.

Estado:
- Pronto para commit isolado, mas nao deve ser misturado com a curadoria territorial no mesmo envio.

## Pacote 4: hub

Arquivos:
- [app/hub/page.tsx](C:/Projetos/Tanque%20Aberto/app/hub/page.tsx)
- [components/hub/collector-hub.tsx](C:/Projetos/Tanque%20Aberto/components/hub/collector-hub.tsx)
- [components/hub/hub-activation-hero.tsx](C:/Projetos/Tanque%20Aberto/components/hub/hub-activation-hero.tsx)
- [components/hub/hub-geofencing-cta.tsx](C:/Projetos/Tanque%20Aberto/components/hub/hub-geofencing-cta.tsx)
- [components/hub/submission-status.tsx](C:/Projetos/Tanque%20Aberto/components/hub/submission-status.tsx)

Risco:
- Medio.
- O ponto mais sensivel e o hero de ativacao, que ainda carrega um href placeholder e merece revisao manual.

Estado:
- Pronto para commit isolado, com observacao de risco no hero de ativacao.

## Pacote 5: curadoria territorial ops

Arquivos:
- [app/admin/actions.ts](C:/Projetos/Tanque%20Aberto/app/admin/actions.ts)
- [app/admin/ops/qualidade/page.tsx](C:/Projetos/Tanque%20Aberto/app/admin/ops/qualidade/page.tsx)
- [components/admin/ops/territorial-curation-panel.tsx](C:/Projetos/Tanque%20Aberto/components/admin/ops/territorial-curation-panel.tsx)
- [lib/ops/territorial-curation.ts](C:/Projetos/Tanque%20Aberto/lib/ops/territorial-curation.ts)

Risco:
- Medio.
- Embora nao afete diretamente o produto publico, ele mexe com regras de promocao, aprovacao e visibilidade do mapa.

Estado:
- Deve ser commitado separadamente do shell/home/hub.

## Pacote 6: release / diagnostico / governanca

Arquivos:
- [package.json](C:/Projetos/Tanque%20Aberto/package.json)
- [scripts/release-gate-preview-real.cjs](C:/Projetos/Tanque%20Aberto/scripts/release-gate-preview-real.cjs)
- [scripts/release-hardening-visual.cjs](C:/Projetos/Tanque%20Aberto/scripts/release-hardening-visual.cjs)
- [scripts/capture-hub-largo.cjs](C:/Projetos/Tanque%20Aberto/scripts/capture-hub-largo.cjs)
- [scripts/capture-layout-largo-intencional.cjs](C:/Projetos/Tanque%20Aberto/scripts/capture-layout-largo-intencional.cjs)
- [scripts/capture-release-hardening-home.cjs](C:/Projetos/Tanque%20Aberto/scripts/capture-release-hardening-home.cjs)
- [scripts/capture-shell-largo-final.cjs](C:/Projetos/Tanque%20Aberto/scripts/capture-shell-largo-final.cjs)
- [tests/bottom-nav-debug.spec.ts](C:/Projetos/Tanque%20Aberto/tests/bottom-nav-debug.spec.ts)

Risco:
- Baixo para runtime do produto.
- Alto para governanca se entrar misturado com feature de UI.

Estado:
- Experimental ou de suporte.
- Nao deve ir no mesmo commit de shell, topo, home ou hub.

## Artefatos que devem ficar fora do proximo deploy

- [reports/2026-03-25-estado-atual-do-projeto.md](C:/Projetos/Tanque%20Aberto/reports/2026-03-25-estado-atual-do-projeto.md)
- [reports/2026-03-25-estado-da-nacao-consolidacao-do-shell-largo-final.md](C:/Projetos/Tanque%20Aberto/reports/2026-03-25-estado-da-nacao-consolidacao-do-shell-largo-final.md)
- [reports/2026-03-25-estado-da-nacao-cta-global-final.md](C:/Projetos/Tanque%20Aberto/reports/2026-03-25-estado-da-nacao-cta-global-final.md)
- [reports/2026-03-25-estado-da-nacao-governanca-final-do-topo.md](C:/Projetos/Tanque%20Aberto/reports/2026-03-25-estado-da-nacao-governanca-final-do-topo.md)
- [reports/2026-03-25-estado-da-nacao-hub-largo-5-0.md](C:/Projetos/Tanque%20Aberto/reports/2026-03-25-estado-da-nacao-hub-largo-5-0.md)
- [reports/2026-03-25-estado-da-nacao-layout-largo-intencional.md](C:/Projetos/Tanque%20Aberto/reports/2026-03-25-estado-da-nacao-layout-largo-intencional.md)
- [reports/2026-03-25-estado-da-nacao-orcamento-final-do-sticky.md](C:/Projetos/Tanque%20Aberto/reports/2026-03-25-estado-da-nacao-orcamento-final-do-sticky.md)
- [reports/2026-03-25-estado-da-nacao-release-hardening-visual.md](C:/Projetos/Tanque%20Aberto/reports/2026-03-25-estado-da-nacao-release-hardening-visual.md)
- [reports/2026-03-26-estado-da-nacao-cta-global-desktop-final-de-verdade.md](C:/Projetos/Tanque%20Aberto/reports/2026-03-26-estado-da-nacao-cta-global-desktop-final-de-verdade.md)
- [reports/2026-03-26-estado-da-nacao-curadoria-territorial-assistida.md](C:/Projetos/Tanque%20Aberto/reports/2026-03-26-estado-da-nacao-curadoria-territorial-assistida.md)
- [reports/2026-03-26-estado-da-nacao-home-orquestrada-final.md](C:/Projetos/Tanque%20Aberto/reports/2026-03-26-estado-da-nacao-home-orquestrada-final.md)
- [reports/2026-03-26-estado-da-nacao-preview-real-gate.md](C:/Projetos/Tanque%20Aberto/reports/2026-03-26-estado-da-nacao-preview-real-gate.md)
- [reports/2026-03-26-estado-da-nacao-topo-ferramenta-final.md](C:/Projetos/Tanque%20Aberto/reports/2026-03-26-estado-da-nacao-topo-ferramenta-final.md)
- [reports/estado_da_nacao_sticky_overlays.md](C:/Projetos/Tanque%20Aberto/reports/estado_da_nacao_sticky_overlays.md)

## Dependencias entre pacotes

- Shell / CTA depende de `app-shell`, `bottom-nav` e das regras das rotas `/atualizacoes`, `/enviar` e `/hub`.
- Topo / sticky depende da home orquestrada, porque o top state muda com scroll, missao e densidade.
- Home orquestrada depende de `lib/ui/home-orchestrator.ts`, `surface-orchestrator` e das queries de dados compartilhadas.
- Hub depende de `AppShell` e da regra de CTA global para nao duplicar acao principal.
- Curadoria territorial depende de `app/admin/actions.ts` e da pagina de qualidade, mas nao deve condicionar o deploy publico.
- Release / diagnostico depende de preview publicado ou ambiente local controlado, e nao deve ser confundido com feature shipped.

## Sequencia sugerida de commits

1. `feat(shell): anchor global CTA and stabilize shell layout`
2. `feat(topo): compact sticky top and density controls`
3. `feat(home): centralize home state orchestration`
4. `feat(hub): widen hub into operational center`
5. `feat(admin): add assisted territorial curation`
6. `chore(release): add preview gate and debug tooling`

## Ordem ideal de merge / deploy

- Primeiro deploy: shell / CTA, topo / sticky, home orquestrada, hub.
- Segundo deploy separado: curadoria territorial ops.
- Fora do deploy: release / diagnostico, reports, test-results, logs e capturas.

## Recomendacao objetiva para o proximo deploy

- Entrar:
  - `components/layout/app-shell.tsx`
  - `components/layout/bottom-nav.tsx`
  - `components/layout/global-submit-cta.tsx`
  - `components/layout/top-orchestrator.tsx`
  - `components/ui/density-selector.tsx`
  - `components/ui/warm-start-badge.tsx`
  - `components/mission/mission-overlay.tsx`
  - `components/home/home-browser.tsx`
  - `lib/ui/home-orchestrator.ts`
  - `components/layout/surface-orchestrator.tsx`
  - `components/station/station-card.tsx`
  - `app/hub/page.tsx`
  - `components/hub/collector-hub.tsx`
  - `components/hub/hub-activation-hero.tsx`
  - `components/hub/hub-geofencing-cta.tsx`
  - `components/hub/submission-status.tsx`

- Segurar:
  - `app/admin/actions.ts`
  - `app/admin/ops/qualidade/page.tsx`
  - `components/admin/ops/territorial-curation-panel.tsx`
  - `lib/ops/territorial-curation.ts`
  - `scripts/*`
  - `tests/bottom-nav-debug.spec.ts`
  - `reports/*`
  - logs e capturas

## Conclusao

O worktree esta funcional, mas a governanca ainda nao e limpa o suficiente para um merge unico sem risco de regressao cruzada.

A melhor estrategia e fechar o pacote visivel do produto em blocos pequenos:

- shell e CTA
- topo e sticky
- home orquestrada
- hub

Depois disso, tratar a curadoria territorial e a instrumentacao de release como pacotes separados.
