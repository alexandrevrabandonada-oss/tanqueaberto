# Estado da Nação: mobile ultra leve após simplificação de fluxos

Data: 2026-03-30

## Resumo executivo

Esta passada atacou peso estrutural, montagem e hidratação no mobile sem reabrir semântica de fluxo.
Home, seletor de posto e envio já estavam semanticamente simplificados. O trabalho aqui foi tirar carga do caminho inicial:
- menos superfície montada cedo demais
- menos imports pesados no chunk inicial
- menos blur e ornamento no shell base
- menos trabalho persistente para telas estreitas

O resultado prático é um app mais leve em rua normal, não só no modo low-perf extremo.

## Gargalos encontrados

1. `components/home/home-browser.tsx`
- a home puxava várias superfícies secundárias no mesmo chunk: onboarding, prompt de identidade, debrief, submissões, recorte, instalação, missão e retorno.
- várias dessas superfícies só importavam valor depois da dobra, ou em estado recorrente.

2. `components/forms/price-submit-form.tsx`
- o envio carregava em conjunto superfícies que só aparecem em fila, sucesso ou feedback.
- o fluxo guiado já estava correto, mas o pacote inicial ainda estava maior do que precisava.

3. `components/layout/app-shell.tsx`
- o shell mantinha ornamentos e blur decorativo também no mobile base.
- isso ajuda a atmosfera, mas custa pintura e não ajuda a ação principal.

4. `components/layout/top-orchestrator.tsx`
- o sticky mantinha blur pesado também no mobile.
- a barra fica mais barata visualmente quando o blur forte entra só em telas médias para cima.

## Patch aplicado

### Home
- `FirstVisitGuide`, `InstallPromptCard`, `ProgressiveIdentityPrompt`, `MySubmissionsList`, `RecorteActivityWidget`, `SessionDebriefModal` e `RouteAssistant` passaram a ser carregados sob demanda com `next/dynamic`.
- imports mortos foram removidos.
- a home continua com lista-first, mapa-lite e hero enxuto, mas com menos peso inicial de JS.

### Envio
- `SubmissionQueuePanel`, `ProgressiveIdentityPrompt`, `PostSubmissionBridge` e `ContextualFeedback` passaram a ser carregados sob demanda.
- `RouteAssistant` foi removido do caminho do envio porque não era usado.
- o `guidedStage` foi simplificado para cálculo direto, sem `useMemo` desnecessário.

### Shell
- o fundo decorativo pesado foi escondido no mobile.
- o blur do header ficou mais leve no mobile e entrou forte só em `md+`.
- a faixa beta e o stamp de build mantêm o estilo, mas com blur condicional.

### Topo sticky
- o sticky perdeu blur pesado no mobile base.
- a superfície continua funcional e compacta, com menor custo visual.

## Antes / Depois

### Antes
- a home carregava mais JS do que precisava para a primeira dobra.
- o envio já começava com mais componentes do que o primeiro gesto exigia.
- o shell mantinha ornamento visual em todo viewport, inclusive em aparelhos medianos e antigos.
- o sticky do topo continuava visualmente pesado no mobile.

### Depois
- a home carrega a parte rica só quando ela faz sentido.
- o envio mantém o fluxo guiado, mas traz as superfícies auxiliares depois.
- o shell base ficou mais leve no mobile sem perder identidade.
- o topo sticky ficou mais barato de manter em tela estreita.

## Leitura de bundle

No build atual, os tamanhos de rota ficaram em:
- `/` 173 kB First Load JS
- `/enviar` 158 kB First Load JS
- `/hub` 151 kB First Load JS

O ganho principal veio de code-splitting e da remoção de superfícies pesadas do caminho inicial.

## Validação

- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou

## Resíduo conhecido

- continuam warnings antigos de restore do cache do webpack em ambiente local/Vercel
- o worktree geral segue amplo, mas sem impacto no comportamento público validado
