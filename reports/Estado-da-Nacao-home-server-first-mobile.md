# Estado da Nacao: home server-first no mobile

## Diagnostico curto
A home ainda concentrava o maior custo residual no mobile na combinacao de `home-browser`, `TopOrchestrator` e superficies de apoio montadas cedo demais.

O gargalo real nao era mais semantica ou layout. Era hidratacao inicial, orquestracao client monolitica e widgets persistentes demais no primeiro frame.

## O que foi quebrado
- A primeira dobra mobile ganhou um lead server-rendered em `components/home/home-server-lead.tsx`.
- `TopOrchestrator` saiu do carregamento inicial do bundle e virou chunk tardio.
- `SurfaceOrchestrator` tambem foi empurrado para carregamento tardio.
- A rota principal passou a entregar busca, chips e lista curta antes do bloco client pesado.

## Principais viloes restantes, antes da refatoracao
1. `components/home/home-browser.tsx` como shell client unico.
2. `components/layout/top-orchestrator.tsx` montando junto com a home.
3. `components/layout/surface-orchestrator.tsx` entrando cedo na arvore.
4. Widgets persistentes do shell global que nao ajudavam a primeira interacao.

## Antes e depois
### Rota `/`
- Antes: `28.4 kB` e `171 kB` First Load JS
- Depois: `25.6 kB` e `168 kB` First Load JS

### Bundle da home
- Antes: chunk principal da home em torno de `102.5 kB`
- Depois: chunk principal da home em `92,408 bytes`

### Leitura pratica
- A home ficou mais curta para carregar e interagir no mobile.
- O primeiro frame agora sai do server mais cedo.
- A orquestracao client pesada ficou abaixo da primeira leitura util.

## Patch aplicado
- [`app/page.tsx`](C:/Projetos/Tanque%20Aberto/app/page.tsx)
- [`components/home/home-server-lead.tsx`](C:/Projetos/Tanque%20Aberto/components/home/home-server-lead.tsx)
- [`components/home/home-browser.tsx`](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)

## Validacao
- `npm run build` passou
- `npm run typecheck` passou em execucao isolada apos o build
- `npm run verify` passou

## Risco residual
O maior custo restante continua em `components/home/home-browser.tsx`, mas agora ele entra depois da primeira dobra. O segundo alvo natural e a rota `/enviar`, que segue mais pesada que o restante do app.
