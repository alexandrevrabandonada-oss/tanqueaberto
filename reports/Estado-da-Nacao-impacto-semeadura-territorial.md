# Estado da Nação: impacto da semeadura territorial

## Diagnóstico
A base já tinha cobertura territorial e auditoria de `station_editor`, mas faltava uma leitura operacional que mostrasse impacto real da semeadura em campo. A nova tela fecha esse vazio no `admin/ops` com foco em mutirão, território e editor.

## O que entrou
- Novo helper em [lib/ops/territorial-seeding-impact.ts](C:/Projetos/Tanque%20Aberto/lib/ops/territorial-seeding-impact.ts)
- Nova tela em [app/admin/ops/impacto-semeadura-territorial/page.tsx](C:/Projetos/Tanque%20Aberto/app/admin/ops/impacto-semeadura-territorial/page.tsx)
- Atalho operacional em [app/admin/ops/page.tsx](C:/Projetos/Tanque%20Aberto/app/admin/ops/page.tsx)
- Link cruzado em [app/admin/ops/cobertura-territorial/page.tsx](C:/Projetos/Tanque%20Aberto/app/admin/ops/cobertura-territorial/page.tsx)

## Leitura operacional
A tela nova responde, por período, cidade, bairro e editor:
- quantos postos foram semeados
- quantos viraram ativos
- quantos ficaram em revisão
- quantos viraram duplicado
- quais bairros saíram de `vazia -> fraca`
- quais bairros saíram de `fraca -> boa`
- quais bairros continuam vazios

## Antes / Depois
- Antes: a operação enxergava cobertura territorial e roster de editor, mas sem cruzar os dois com impacto de semeadura.
- Depois: existe uma leitura única de impacto territorial e por editor, com período alternável em `7d`, `30d` e `90d`.
- Antes: bairros em movimento eram inferidos só por peças soltas.
- Depois: a nova página compara uma janela atual com uma janela anterior do mesmo tamanho para estimar transição territorial.

## Antes / Depois com números
- Antes: não havia rota dedicada para impacto da semeadura.
- Depois: rota [\`/admin/ops/impacto-semeadura-territorial\`](C:/Projetos/Tanque%20Aberto/app/admin/ops/impacto-semeadura-territorial/page.tsx) com `175 B` de route size e `106 kB` de First Load JS.
- [\`/admin/ops\`](C:/Projetos/Tanque%20Aberto/app/admin/ops/page.tsx) permanece em `12.8 kB` de route size e `127 kB` de First Load JS.
- `First Load JS shared by all` permaneceu em `103 kB`.

## Nota de método
A leitura de transição territorial é uma inferência baseada na comparação entre o snapshot atual e o snapshot da janela anterior. Isso é suficiente para operação de mutirão, mas ainda não substitui um histórico persistido diário.

## Validação
- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou

## Resumo final
A semeadura agora tem leitura própria de impacto por território e por editor, acoplada à cobertura territorial e à curadoria de postos, sem pesar o fluxo público.
