# Estado da Nacao: Home Publica Brutalmente Simples

Data de consolidacao: 2026-03-30

## Diagnostico curto

A home publica foi reduzida para um eixo principal claro no mobile:
- busca continua no topo
- hero curto explica o que fazer
- `Enviar preco` vira a acao principal
- `Abrir mapa` vira a acao secundaria
- a superficie util entra em modo lista-first
- o restante da home fica colapsado no mobile fraco ou em contexto de rua

## O que foi simplificado

- retirei a CTA global do shell no mobile inicial para evitar competencia com o hero da home
- criei uma hero curta acima da dobra com duas acoes apenas: `Enviar preco` e `Abrir mapa`
- puxei a superficie util do mapa/lista para logo abaixo da hero no modo leve
- escondi o prompt de identidade progressiva no mobile simplificado
- escondi a grade grande da home no mobile leve, preservando o layout completo para desktop

## Antes / Depois

### Antes
- hero mais competitivo com outras superfícies paralelas
- CTA global no shell podia disputar foco com a home
- varias secoes competiam acima e logo abaixo da dobra
- o mapa ainda ocupava mais protagonismo no mobile

### Depois
- um unico eixo de leitura na home mobile
- um CTA dominante por contexto
- lista-first funciona como modo principal
- o mapa continua disponivel, mas sem mandar na primeira leitura
- o desktop continua rico sem regressao funcional

## Arquivos tocados

- [app/page.tsx](C:/Projetos/Tanque%20Aberto/app/page.tsx)
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)

## Validacao

- `npm run typecheck` passou
- `npm run build` passou
- `npm run verify` passou

## Observacao operacional

A mudança respeita o modo low-perf existente e nao altera login, branding ou o fluxo publico validado.
