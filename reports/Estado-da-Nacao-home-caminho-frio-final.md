# Estado da Nacao: home caminho frio final

## Resumo executivo

A home foi passada por uma refatoracao agressiva de caminho frio. O objetivo nao era mexer em UX, mas tirar custo do primeiro frame e separar o miolo pesado em uma ilha tardia propria.

Resultado prático:
- a primeira dobra ficou mais leve;
- busca e chips continuam cedo;
- o bloco pesado de lista, mapa, stats e colaboracao foi empurrado para uma ilha tardia;
- a home continuou funcional sem reabrir semantica central.

## Diagnostico curto

O gargalo residual da home ainda estava no client shell monolitico. O primeiro contato montava mais superfícies do que o mobile precisava, especialmente:
- lista grande do recorte;
- mapa e rail de apoio;
- stats, colaboração e atualizações;
- quick access e widgets secundários.

A correção foi quebrar o miolo pesado em `HomeDeferredSections`, carregado apenas depois da primeira interação útil.

## O que foi separado

- [`components/home/home-browser.tsx`](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)
- [`components/home/home-deferred-sections.tsx`](C:/Projetos/Tanque%20Aberto/components/home/home-deferred-sections.tsx)

## Antes e depois

### Rota `/`

- antes: `25.6 kB` de route size e `168 kB` de First Load JS
- depois: `23.7 kB` de route size e `162 kB` de First Load JS

### Chunk tardio da home

A superficie pesada saiu do caminho critico e passou a carregar como ilha tardia:
- `components/home/home-browser.tsx -> @/components/home/home-deferred-sections`
- `static/chunks/5654-d331147bb27f6113.js` (`12,448` bytes)
- `static/chunks/30.ce815bb8677e0787.js` (`27,602` bytes, shared)

### Leitura pratica

- a primeira interação útil agora chega com menos custo estrutural;
- o grosso do conteudo secundario deixou de competir com a entrada;
- a home continua com busca e contexto cedo, mas sem carregar o resto no primeiro frame.

## Validacao

- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou

## Resultado final

A home ficou mais leve no mobile sem alterar o fluxo validado. O trabalho pesado agora entra tarde, e o primeiro frame ficou mais proximo de uma tela de entendimento e acao rapida do que de um painel carregado demais.
