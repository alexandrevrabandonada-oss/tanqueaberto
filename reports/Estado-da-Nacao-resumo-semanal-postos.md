# Estado da Nação: resumo semanal operacional de postos

## Resumo
A frente de postos ganhou uma leitura semanal curta para coordenação. A página consolida:

- territórios quentes da semana
- territórios parados
- bairros que melhoraram
- bairros que seguem vazios
- postos sem atualização prioritários
- station_editors com melhor saldo operacional

Ela cruza cobertura atual, histórico persistido, impacto da semeadura, fila territorial e curadoria de postos novos sem virar dashboard pesado.

## O que entrou
- [app/admin/ops/resumo-semanal-postos/page.tsx](C:/Projetos/Tanque%20Aberto/app/admin/ops/resumo-semanal-postos/page.tsx)
- [app/admin/ops/page.tsx](C:/Projetos/Tanque%20Aberto/app/admin/ops/page.tsx)
- [lib/ops/territorial-coverage.ts](C:/Projetos/Tanque%20Aberto/lib/ops/territorial-coverage.ts)
- [lib/ops/territorial-coverage-snapshots.ts](C:/Projetos/Tanque%20Aberto/lib/ops/territorial-coverage-snapshots.ts)
- [lib/ops/territorial-seeding-impact.ts](C:/Projetos/Tanque%20Aberto/lib/ops/territorial-seeding-impact.ts)
- [lib/ops/territory-workflow.ts](C:/Projetos/Tanque%20Aberto/lib/ops/territory-workflow.ts)
- [lib/ops/station-editors.ts](C:/Projetos/Tanque%20Aberto/lib/ops/station-editors.ts)

## Leitura operacional
### Territórios quentes da semana
São os bairros que concentram cobertura atual, impacto da semeadura e fila territorial.

### Territórios parados
São os bairros que ficaram estagnados no histórico e precisam de novo empurrão.

### Bairros que melhoraram
São os bairros que saíram de cobertura fraca ou vazia e já merecem repetição do padrão.

### Bairros vazios
São as lacunas que ainda dependem de semeadura ou confirmação de base.

### Postos sem atualização prioritários
São os pontos que esfriaram e precisam de novo preço ou revisão rápida.

### Station editors com melhor saldo
São os editores com maior combinação de ativações úteis e menor peso de duplicidade ou revisão.

## Antes e depois
Antes:

- a operação tinha cobertura, histórico, impacto e editores em telas separadas
- a coordenação semanal precisava cruzar tudo manualmente
- não existia um resumo único da frente de postos

Depois:

- existe uma leitura semanal curta, própria para mutirão e coordenação
- as superfícies já existentes continuam valendo, mas agora há uma porta de entrada operacional
- o resumo aponta a próxima ação sem exigir dashboard analítico pesado

## Validação
- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou

## Números
- `/admin/ops/resumo-semanal-postos` ficou com `172 B` de route size e `106 kB` de First Load JS
- `First Load JS shared by all` permaneceu em `103 kB`

## Observação
O resumo semanal não substitui cobertura, histórico, impacto ou fila do dia. Ele só junta o que importa para a coordenação semanal em uma leitura curta.