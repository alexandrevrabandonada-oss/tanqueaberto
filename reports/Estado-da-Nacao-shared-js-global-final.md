# Estado da Nacao: shared JS global final

## Resumo executivo

Esta passada atacou o chrome global e o runtime client que ainda acordavam cedo demais no app inteiro.

Resultado objetivo:
- o `First Load JS` da home caiu de `158 kB` para `157 kB`
- `/enviar` ficou em `132 kB`, com o mesmo teto de antes e sem regressao
- o shared JS global continuou em `103 kB`
- o gargalo residual real nao e mais o chrome; ele agora esta concentrado em chunks compartilhados de hooks e utilitarios client comuns

Conclusao direta:
- esta passada melhorou o caminho quente estrutural do shell
- mas nao rompeu o teto do shared global
- o proximo corte relevante precisa sair de hooks/client state comuns, nao de mais polimento no chrome

## Gargalos reais encontrados

### 1. shared chunk `1255-aadf393aa3a56bfa.js` (`46 kB`)

Este chunk continua carregando muitos modulos client compartilhados entre home, hub e envio, incluindo sinais como:
- `MissionProvider` e `useMission`
- `trackProductEvent`
- `useMySubmissions`
- `useOperationalFocus`
- `useLocationHardening` / geolocalizacao client
- identidade progressiva e memoria local
- helpers de navegacao e estado local reaproveitados em varias rotas

Leitura pratica:
- o shared quente nao esta mais preso ao header/nav em si
- ele esta preso a estado operacional client reutilizado demais entre rotas principais

### 2. shared chunk `4bd1b696-f785427dddbba9fb.js` (`54.2 kB`)

Este continua sendo o segundo teto global. Pelo perfil do build, ele segue dominado por vendor/router/runtime compartilhado.

Leitura pratica:
- aqui o espaco para ganho sem refatoracao mais profunda e menor
- nao e chrome visual; e base compartilhada do app/router/client runtime

### 3. chunk principal de `price-submit-form`

Mesmo apos o server-first e os splits internos anteriores, o chunk do formulario ainda segue relevante:
- `static/chunks/5699.1a6ee91a91e7e1c8.js`: `62128` bytes

Leitura pratica:
- o maior bloco especifico que ainda vale quebrar esta no miolo client do envio
- mas ele ja deixou de ser o teto global principal

## O que foi mudado nesta passada

### 1. chrome global adiado no shell

Arquivo:
- `components/layout/shell-deferred-chrome.tsx`

Mudanca:
- `BottomNav`
- `PerformanceModeSync`
- `PwaStatusStrip`
- `PwaRegister`
- `TestModeIndicator`
- `MissionOverlay`

passaram a montar so depois de `requestIdleCallback` ou da primeira interacao.

Impacto:
- menos trabalho no primeiro frame util
- menos chrome client acordando cedo demais
- menor disputa com busca/lista/CTA na abertura real

### 2. root layout mais leve

Arquivos:
- `app/layout.tsx`
- `components/ui/root-error-boundary.tsx`

Mudanca:
- o root parou de puxar um runtime client extra diretamente
- o boundary global virou uma versao minima, sem `lucide-react` e sem `Button`

Impacto:
- menos UI rica no caminho global de seguranca
- root mais previsivel e mais barato estruturalmente

## Antes / depois

### Base de comparacao

Antes desta passada:
- `/`: `19.2 kB` route size / `158 kB` First Load JS
- `/enviar`: `1.87 kB` route size / `132 kB` First Load JS
- shared JS global: `103 kB`

Depois desta passada:
- `/`: `20.9 kB` route size / `157 kB` First Load JS
- `/enviar`: `1.86 kB` route size / `132 kB` First Load JS
- `/hub`: `15.6 kB` route size / `152 kB` First Load JS
- shared JS global: `103 kB`

## Leitura honesta dos numeros

Ganhos reais:
- a home perdeu `1 kB` de `First Load JS`
- o shell client passou a acordar mais tarde, o que reduz trabalho precoce percebido
- o envio nao regrediu

Limite encontrado:
- o shared global nao caiu
- a maior parte do peso residual nao esta mais no chrome, e sim no estado client compartilhado entre rotas

## Arquivos alterados

- `app/layout.tsx`
- `components/layout/app-shell.tsx`
- `components/layout/shell-deferred-chrome.tsx`
- `components/ui/root-error-boundary.tsx`

## Validacao

Validado no estado final:
- `npm run build` passou dentro do `verify`
- `npm run typecheck` passou
- `npm run verify` passou

Observacoes:
- houve um `npm run build` isolado com `Unexpected end of JSON input` durante `Collecting page data`, mas a execucao completa seguinte em `npm run verify` recompilou normalmente e passou inteira
- segue o warning conhecido de `react-hooks/exhaustive-deps` em `components/layout/retention-hub.tsx`
- segue ruido eventual de cache do webpack em `.next/cache`, sem bloquear `verify`

## Conclusao operacional

Esta passada esgotou o que ainda dava para cortar no chrome global sem reabrir arquitetura maior.

O proximo ganho de verdade nao esta mais em:
- nav
- overlay
- badges
- runtime visual global

O proximo ganho de verdade esta em:
- `MissionProvider` e hooks de missao/operacao que hoje vazam para varias rotas
- `useMySubmissions`, `useOperationalFocus`, identidade progressiva e geolocalizacao client compartilhadas demais
- mais isolamento dentro do chunk de `price-submit-form`
