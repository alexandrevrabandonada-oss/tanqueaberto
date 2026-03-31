# Estado da Nacao: profiling final mobile real

## Resumo executivo

A passada final encontrou um gargalo mais serio do que micro-ajustes: a home ainda carregava um bloco inteiro duplicado no `home-browser`, mesmo depois da extracao tardia. Isso mantinha conteudo pesado vivo no caminho quente do mobile e diluia o ganho das refatoracoes server-first anteriores.

Depois da limpeza e de um pequeno corte no `/enviar`, o app ficou estruturalmente mais leve no uso frio:
- a home caiu de `23.7 kB / 162 kB` para `19.2 kB / 158 kB`;
- o `/enviar` manteve `1.87 kB / 132 kB`, mas perdeu hidratacao operacional cedo demais;
- o principal vilao remanescente passou a ser o shared JS global, nao mais a home duplicada.

## O que ainda pesava de verdade

### 1. Home com resíduo duplicado no caminho quente

O `home-browser` ainda renderizava blocos que ja deveriam estar atrasados em ilha tardia:
- quick access;
- hub rico;
- mapa/rail amplo;
- lista longa e superficies de colaboracao.

Esse resíduo era o principal motivo da sensacao de pagina pesada no mobile.

### 2. `/enviar` ainda hidratava borda operacional cedo

O formulario guiado ja estava server-first e splitado, mas ainda fazia cedo demais:
- leitura da fila local;
- leitura de contexto local de home/ultimo posto;
- sincronizacao de sinais operacionais que nao ajudam na primeira foto.

### 3. Shared chunks continuam grandes

O peso compartilhado segue alto:
- `First Load JS shared by all`: `103 kB`
- maiores blocos compartilhados:
  - `chunks/1255-aadf393aa3a56bfa.js`: `46 kB`
  - `chunks/4bd1b696-f785427dddbba9fb.js`: `54.2 kB`

Ou seja: agora o principal peso percebido residual esta mais no shared runtime/chrome do que na home em si.

## Patch aplicado

- [`components/home/home-browser.tsx`](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)
- [`components/forms/price-submit-form.tsx`](C:/Projetos/Tanque%20Aberto/components/forms/price-submit-form.tsx)

## Antes e depois

### Home `/`

- antes: `23.7 kB` route size e `162 kB` First Load JS
- depois: `19.2 kB` route size e `158 kB` First Load JS

### Envio `/enviar`

- antes: `1.87 kB` route size e `132 kB` First Load JS
- depois: `1.87 kB` route size e `132 kB` First Load JS

Leitura correta do `/enviar`:
- nao houve queda de bundle da rota nesta passada;
- o ganho foi de caminho critico: fila local e contexto operacional foram empurrados para idle;
- a primeira etapa continua a mesma, mas com menos trabalho sincrono no mount.

### Chunk crítico do formulário de envio

- `components/forms/price-submit-island.tsx -> @/components/forms/price-submit-form`
- `static/chunks/5699.1a6ee91a91e7e1c8.js`: `62,128` bytes
- `static/chunks/4173-6c3be41154f74b6f.js`: `15,655` bytes compartilhados

## O que foi otimizado na pratica

### Home

- removido o bloco duplicado pesado do `home-browser`;
- mantido apenas o caminho quente realmente util antes da ilha tardia;
- preservada a extracao tardia ja existente, agora sem concorrencia de uma segunda renderizacao do mesmo conteudo.

### Envio

- leitura da fila local empurrada para idle;
- leitura do contexto local de home/ultimo posto empurrada para idle;
- reduzido trabalho sincronico sem reabrir o fluxo guiado.

## Maiores viloes residuais, em ordem

1. shared chunks globais (`103 kB`)
2. shell e chrome globais fora das rotas
3. chunk principal do `price-submit-form` (`62,128` bytes)
4. TopOrchestrator e filtros da home, que ainda sao o principal bloco client do primeiro frame util

## Validacao

- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou

## Conclusao

A sensacao residual de peso no mobile caiu porque o maior erro restante era estrutural: a home ainda duplicava conteudo pesado no client. Com isso removido, a home deixou de ser o gargalo dominante. O proximo teto real de performance agora esta no shared JS global e no chunk principal do formulario de envio.
