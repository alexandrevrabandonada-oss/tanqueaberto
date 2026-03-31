# Estado da Nacao - Hub Zero State Mobile v2

## Contexto

A home do Hub ainda acumulava sinais demais na entrada mobile: a leitura inicial podia parecer uma mistura de onboarding, continuidade e CTA secundario. A passada desta vez focou em reduzir a superficie zero-state para um unico eixo primario e em manter a continuidade como primeira leitura quando ja existe atividade.

## Auditoria

Trechos auditados:

- `app/hub/page.tsx`
- `components/hub/collector-hub.tsx`
- `components/hub/hub-activation-hero.tsx`
- `components/hub/submission-status.tsx`
- `components/hub/proof-of-life-reforcement.tsx`
- `components/hub/territorial-impact-card.tsx`
- CTA shell/global via `AppShell` e `GlobalSubmitCta`

Achados principais:

- O shell global ja estava desativado no Hub, entao a duplicacao nao vinha do `GlobalSubmitCta`.
- A pagina tem um hero de continuidade no `md+`, mas ele nao aparece no mobile narrow.
- O zero-state real do Hub estava concentrado em `HubActivationHero`, mas o hero ainda era denso demais para mobile.
- O estado operacional ja priorizava continuidade, mas ainda carregava chips e texto contextual em excesso para telas estreitas.

## Regras aplicadas

### Zero-state

- Uma superficie primaria clara.
- Um CTA principal.
- Sem duplicacao de CTA.
- Sem badge, sparkline ou decoracao visual competindo com a primeira acao.

### Estado com atividade

- Continuidade entra primeiro.
- O onboarding recua.
- O que veio antes vira contexto, nao headline.

### Mobile narrow

- Sem empilhar shell, hero, CTA e rail.
- O destaque fica no primeiro gesto, nao no volume de UI.

## O que mudou

### 1. Hero de ativacao ficou compacto no mobile

- `HubActivationHero` ganhou a prop `compact`.
- No mobile narrow, o badge decorativo some e a arte lateral fica escondida.
- O titulo e a descricao ficam mais enxutos.
- O CTA continua unico e vira largura total.

### 2. Zero-state passou a usar o modo compacto

- `CollectorHub` detecta viewport narrow e passa `compact={isNarrowMobile}` para o hero.
- O zero-state continua tendo uma unica superficie primária, mas mais curta e menos pesada.

### 3. Estado operacional reforcou a continuidade primeiro

- O card principal de continuidade continua sendo a primeira leitura fora do zero-state.
- Em mobile narrow, os chips de contexto recuam para reduzir duplicacao visual.
- A sequencia operacional segue sendo: gesto recente, fila/moderacao, impacto e memoria.

## Antes e Depois por breakpoint

| Breakpoint | Antes | Depois |
| --- | --- | --- |
| Mobile narrow | Hero de ativacao mais pesado, com badge, decoracao e CTA ocupando mais altura do que o necessario. O estado operacional também podia parecer verboso demais. | Zero-state fica compacto, sem badge decorativo nem arte pesada. Um unico eixo primario conduz a tela. No operacional, a continuidade entra primeiro e os chips recuam. |
| Desktop | O Hub ja tinha continuidade real, mas o topo de ativacao e alguns detalhes visuais ainda pareciam mais editoriais do que operacionais. | Mantive a continuidade como leitura principal e preservei a estrutura grande apenas para telas que comportam essa densidade. |
| PWA wide | A tela larga continuava funcional, mas ainda podia carregar peso de onboarding demais na entrada. | A superficie principal segue limpa, com ativacao menos cenografica e continuidade mais evidente quando ha atividade. |

## Hierarquia final de superficies

### Zero-state

- Superficie primária: `HubActivationHero` em modo compacto.
- CTA principal: `Abrir mapa agora`.
- Superficie secundária: nenhuma no mobile narrow.

### Com atividade

- Superficie primária: card de continuidade com ultimo gesto, pendencias e proximo passo.
- Superficies secundarias: sessao recente, fila e moderacao, impacto e memoria.
- O onboarding nao compete com a leitura principal.

## Validação

Comandos executados:

- `npm run typecheck`
- `npm run build`
- `npm run verify`

Resultado:

- `typecheck`: passou.
- `build`: passou.
- `verify`: passou.

Warnings vistos no build/verificacao:

- `components/forms/price-submit-form.tsx`
- `components/home/home-browser.tsx`
- `components/layout/retention-hub.tsx`

Nao alterei essas areas.

## Arquivos tocados

- `components/hub/collector-hub.tsx`
- `components/hub/hub-activation-hero.tsx`

## Leitura final

O Hub mobile agora entra com uma unica leitura primaria no zero-state, sem empilhar onboarding com continuidade. Quando ha atividade, a tela abre direto no que importa: o ultimo gesto e o proximo passo real.
