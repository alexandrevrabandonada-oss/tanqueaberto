# Estado da Nação: painéis operacionais com ação direta

## Diagnóstico curto

Os painéis de cobertura territorial, impacto de semeadura e histórico persistido já informavam bem, mas ainda exigiam que a operação saísse da leitura e fosse caçar a próxima tela manualmente.

A passada conectou as superfícies ao próximo gesto operacional: semeadura, curadoria, postos sem atualização e editores que atuaram no território.

## O que foi ligado

### Cobertura territorial

- Cada zona prioritária agora abre ações diretas:
  - `Abrir semeadura neste bairro`
  - `Ver postos sem atualização`
  - `Abrir curadoria deste território`
  - `Ver editores que atuaram aqui`
- As cidades e bairros também ganharam as mesmas ações contextuais.
- O fluxo continua simples, sem dashboard bonito demais.

### Impacto da semeadura

- A leitura de impacto ganhou um foco operacional no topo, com o bairro/cidade mais útil da janela atual.
- A partir desse foco, a operação pode abrir diretamente:
  - semeadura
  - postos sem atualização
  - curadoria
  - editores do território

### Histórico persistido

- O histórico de cobertura agora também aponta para a próxima ação:
  - semeadura
  - postos sem atualização
  - curadoria
  - editores que atuaram no território
- O relatório continua sendo leitura de evolução, mas deixa de ser só observação.

### Curadoria territorial

- A página de qualidade aceita território em foco.
- Quando a cobertura manda para a curadoria, a fila já chega filtrada pelo bairro/cidade em questão.

### Station editors

- A página de `station_editor` passa a entender contexto territorial.
- O roster e a auditoria leve são filtrados por cidade/bairro quando existe foco.
- Isso fecha o ciclo entre semeadura, edição leve e leitura de quem atuou naquele território.

### Postos sem atualização

- A página `postos/sem-atualizacao` passou a respeitar o território recebido.
- Assim, a ação de cobertura não abre uma lista genérica quando o objetivo é atacar uma lacuna específica.

## Antes / Depois

### Antes

- Os painéis mostravam o estado do território.
- O operador precisava abrir outra tela para agir.
- O contexto de cidade/bairro se perdia no caminho entre leitura e execução.

### Depois

- Os painéis agora chamam a próxima ação diretamente.
- O território em foco carrega para semeadura, curadoria, editores e postos sem atualização.
- A operação consegue sair da leitura e entrar no mutirão com menos cliques e menos dúvida.

## Números

- `/admin/ops/cobertura-territorial`: `178 B` de route size e `106 kB` de First Load JS
- `/admin/ops/impacto-semeadura-territorial`: `178 B` de route size e `106 kB` de First Load JS
- `/admin/ops/historico-cobertura-territorial`: `178 B` de route size e `106 kB` de First Load JS
- `/admin/ops/station-editors`: `168 B` de route size e `106 kB` de First Load JS
- `/admin/ops/qualidade`: `5.96 kB` de route size e `120 kB` de First Load JS
- `First Load JS shared by all`: `103 kB`

## Validação

- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou

## Arquivos principais

- `app/admin/ops/cobertura-territorial/page.tsx`
- `app/admin/ops/impacto-semeadura-territorial/page.tsx`
- `app/admin/ops/historico-cobertura-territorial/page.tsx`
- `app/admin/ops/qualidade/page.tsx`
- `app/admin/ops/station-editors/page.tsx`
- `app/postos/sem-atualizacao/page.tsx`
- `lib/ops/station-editors.ts`
- `lib/ops/station-light-edits.ts`
