# Estado atual do projeto - 2026-03-25

## Resumo executivo

O projeto esta em um estado funcional e maduro, com a identidade visual do Bomba Aberta redesenhada, a PWA alinhada ao novo sistema de icones e a navegação principal já endurecida para mobile e preview.

O worktree, entretanto, continua com mudanças paralelas abertas. Isso significa que o estado do repositório nao esta limpo e ha pacotes em andamento fora do ultimo commit publicado.

## Snapshot do repositorio

- Branch atual: `main`
- Ultimo commit publicado: `317cd37` - `Redesign favicon and app icons`
- Commits recentes relevantes:
  - `317cd37` - `Redesign favicon and app icons`
  - `8f3ec43` - `Harden mobile bottom nav`
  - `4c1ed3d` - `Force PWA update refresh`
  - `f86dac5` - `Harden mobile bottom tab hit area`
  - `c41fe6e` - `Fix bottom tab navigation`
  - `702820a` - `Fix FAB variant props`

## Estado funcional confirmado

- `npm run build` passou no estado atual.
- O sistema de marca foi reorganizado em tres camadas:
  - icone puro para favicon e app icons
  - wordmark horizontal para superfices largas e branding interno
  - selo institucional para apoio secundario
- A metadata do app agora aponta para o novo sistema de icones na raiz de `public`.
- O manifest e o service worker foram atualizados para a familia nova de assets.
- O preview social foi redirecionado para a nova imagem horizontal de marca.

## Arquivos centrais do estado atual

- [app/layout.tsx](C:/Projetos/Tanque%20Aberto/app/layout.tsx)
- [public/manifest.webmanifest](C:/Projetos/Tanque%20Aberto/public/manifest.webmanifest)
- [public/sw.js](C:/Projetos/Tanque%20Aberto/public/sw.js)
- [scripts/generate-brand-assets.ts](C:/Projetos/Tanque%20Aberto/scripts/generate-brand-assets.ts)
- [components/brand/brand-mark.tsx](C:/Projetos/Tanque%20Aberto/components/brand/brand-mark.tsx)
- [lib/beta/gate.ts](C:/Projetos/Tanque%20Aberto/lib/beta/gate.ts)
- [lib/dev/preview-data.ts](C:/Projetos/Tanque%20Aberto/lib/dev/preview-data.ts)
- [public/favicon.ico](C:/Projetos/Tanque%20Aberto/public/favicon.ico)
- [public/icon-192.png](C:/Projetos/Tanque%20Aberto/public/icon-192.png)
- [public/icon-512.png](C:/Projetos/Tanque%20Aberto/public/icon-512.png)
- [public/apple-touch-icon.png](C:/Projetos/Tanque%20Aberto/public/apple-touch-icon.png)

## Marca e icones

O sistema final de icones ficou assim:

- Arte 2, a bomba simples, virou a base do favicon, app icon, maskable icon e apple touch icon.
- Arte 1, o wordmark horizontal, virou a base das superfices largas e do branding horizontal.
- Arte 3, o selo institucional, ficou como peça secundaria para uso institucional e apoio visual.

Arquivos principais gerados:

- `public/favicon.ico`
- `public/favicon.svg`
- `public/favicon-16.png`
- `public/favicon-32.png`
- `public/favicon-48.png`
- `public/icon-192.png`
- `public/icon-512.png`
- `public/icon-master-1024.png`
- `public/maskable-icon-192.png`
- `public/maskable-icon-512.png`
- `public/apple-touch-icon.png`

## Estado de navegacao e shell

A shell principal, a barra inferior e os componentes de marca continuam consistentes com o trabalho recente de endurecimento visual e de toque.

O foco do ultimo ciclo foi reduzir risco de discrepancia entre local, preview e cliente com cache antigo, alem de manter a estrutura responsiva mais previsivel.

## Worktree atual

O repositorio nao esta limpo.

Mudancas ainda presentes no workspace:

- `app/atualizacoes/page.tsx`
- `app/enviar/page.tsx`
- `app/hub/page.tsx`
- `components/home/home-browser.tsx`
- `components/hub/collector-hub.tsx`
- `components/hub/hub-activation-hero.tsx`
- `components/hub/hub-geofencing-cta.tsx`
- `components/hub/submission-status.tsx`
- `components/layout/app-shell.tsx`
- `components/layout/bottom-nav.tsx`
- `components/mission/mission-overlay.tsx`
- `components/station/station-card.tsx`
- `components/ui/warm-start-badge.tsx`
- `lib/data/queries.ts`
- `lib/ops/release-control.ts`
- `lib/ops/scheduler.ts`
- `package.json`
- `components/layout/global-submit-cta.tsx` `untracked`
- `components/layout/top-orchestrator.tsx` `untracked`
- `components/ui/density-selector.tsx` `untracked`
- `scripts/capture-hub-largo.cjs` `untracked`
- `scripts/capture-layout-largo-intencional.cjs` `untracked`
- `scripts/capture-release-hardening-home.cjs` `untracked`
- `scripts/release-hardening-visual.cjs` `untracked`
- `tests/bottom-nav-debug.spec.ts` `untracked`
- varios relatórios em `reports/` ainda nao consolidados em commit
- arquivos de `test-results/` marcados como removidos

Interpretacao:

- Ha um conjunto grande de mudanças de produto e de observabilidade ainda em andamento.
- Parte delas pertence a pacotes ja relatados, mas nao necessariamente consolidados em commit nesta thread.
- Nao e seguro assumir que o worktree representa um unico pacote coeso sem revisao especifica.

## Validação recente

Ultima validacao concluida:

- `npm run build` passou.

Avisos ainda presentes no build:

- warnings antigos de `react-hooks/exhaustive-deps`
- aviso conhecido de uso dinamico em `/hub` por `cookies`

## Pendencias objetivas

1. Decidir se o worktree paralelo deve ser consolidado, separado em commits menores ou mantido como trabalho em progresso.
2. Confirmar em preview e dispositivo real se o comportamento de navegacao continua consistente apos o ultimo deploy.
3. Revisar se os assets legados de marca que ainda existem no disco devem ser removidos em um passo de limpeza posterior.
4. Se a superficie de topo, Hub e CTA continuar a evoluir, consolidar os pacotes em relatórios e commits separados para reduzir risco de regressao.

## Conclusao

O projeto esta funcional, com identidade visual e sistema de icones atualizados, e com a shell responsiva e a navegacao estabilizadas em um nivel bom de produto.

O principal risco agora nao e estrutural; e de governanca do worktree. Ha varias frentes abertas ao mesmo tempo, entao o próximo passo correto e separar o que entra em cada pacote antes de consolidar novo deploy.
