# Estado da Nação: fix bottom nav mobile

## Diagnóstico curto

A causa real do bug tinha duas camadas, ambas ligadas a montagem tardia.

Primeiro, a `BottomNav` estava renderizada dentro de `ShellDeferredChrome`, e esse bloco só liberava o chrome após `requestIdleCallback`, timeout de fallback ou primeira interação.

Depois de tirar a nav do fluxo deferido, a validação funcional mostrou um segundo atraso: a própria `BottomNav` ainda era client-only por depender de `usePathname`, então ela não existia no DOM no `domcontentloaded` e continuava chegando só na hidratação.

No mobile, a combinação desses dois fatores quebrava o requisito de barra presente no primeiro frame útil.

## Patch aplicado

A correção foi cirúrgica:

- movi a `BottomNav` para renderização imediata em `AppShell`
- removi a `BottomNav` do componente `ShellDeferredChrome`
- converti a `BottomNav` para server-rendered
- passei `activeNavPath` explícito nas rotas críticas para preservar o estado ativo sem voltar para `usePathname`
- preservei o defer para `PerformanceModeSync` e `PwaStatusStrip`
- mantive o restante do runtime deferido, como `MissionOverlay`, fora dessa correção
- endureci a barra inferior com `position: fixed`, `bottom: 0`, `z-index` mais alto e padding com safe area usando `env(safe-area-inset-bottom)` com fallback por `max(...)`
- mantive a nav fora de qualquer contêiner com clipping direto; ela continua fixa na viewport, não presa ao fluxo de conteúdo

## Antes

- `BottomNav` dependia de idle, timeout ou primeira interação para montar
- mesmo fora do idle, a barra ainda dependia de hidratação por causa de `usePathname`
- a navegação principal do produto sumia em home, enviar, hub e atualizações quando o deferred chrome não liberava cedo

## Depois

- `BottomNav` monta imediatamente junto do `AppShell`
- a barra existe no DOM desde o primeiro carregamento útil nas rotas validadas
- apenas chrome auxiliar continua deferido
- o restante das otimizações de performance foi preservado

## Arquivos tocados

- `components/layout/app-shell.tsx`
- `components/layout/shell-deferred-chrome.tsx`
- `components/layout/bottom-nav.tsx`
- `app/globals.css`
- `app/page.tsx`
- `app/enviar/page.tsx`
- `app/hub/page.tsx`
- `app/atualizacoes/page.tsx`

## Cobertura das rotas alvo

As quatro rotas pedidas continuam passando por `AppShell`, então a correção cobre diretamente:

- home
- enviar
- hub
- atualizações

## Validação executada

Comandos solicitados:

- `npm run build`
- `npm run typecheck`
- `npm run verify`

Validação funcional em viewport mobile:

- `domcontentloaded`: `BottomNav` presente no DOM em `/`, `/enviar`, `/hub` e `/atualizacoes`
- `+250ms`: `BottomNav` visível nas quatro rotas com `position: fixed`, `bottom: 0`, `z-index: 1100` e caixa visível `390x73`

Resultado:

- `npm run build` ok
- `npm run typecheck` ok
- `npm run verify` ok
- `check:drift` ok dentro do `verify`