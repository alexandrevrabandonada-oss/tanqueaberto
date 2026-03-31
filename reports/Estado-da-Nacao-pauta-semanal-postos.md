# Estado da Nação: pauta semanal exportável de postos

## O que foi feito
Criei uma pauta semanal curta a partir do resumo operacional de postos, pensada para copiar em WhatsApp, mutirão e coordenação fora do sistema.

## Superfície nova
- [app/admin/ops/resumo-semanal-postos/page.tsx](C:/Projetos/Tanque%20Aberto/app/admin/ops/resumo-semanal-postos/page.tsx)
- [components/admin/ops/weekly-posts-pauta-actions.tsx](C:/Projetos/Tanque%20Aberto/components/admin/ops/weekly-posts-pauta-actions.tsx)
- [lib/ops/weekly-posts.ts](C:/Projetos/Tanque%20Aberto/lib/ops/weekly-posts.ts)
- [app/admin/ops/export/route.ts](C:/Projetos/Tanque%20Aberto/app/admin/ops/export/route.ts)

## O que a pauta entrega
- bairros quentes
- bairros parados
- bairros vazios
- postos sem atualização prioritários
- station_editors com melhor saldo operacional
- texto pronto para copiar
- link de WhatsApp
- CSV simples de exportação

## Antes / Depois
- Antes: o resumo semanal era útil dentro do OPS, mas ainda dependia de leitura manual para virar pauta de rua.
- Depois: a mesma leitura vira um texto curto e copiável, com blocos por prioridade.
- Antes: não havia um CSV simples dedicado à pauta semanal.
- Depois: a exportação `weekly-posts` sai pela rota de export já existente.

## Validação
- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou

## Leitura operacional
- A pauta não é um dashboard novo.
- É a mesma leitura semanal transformada em formato de coordenação.
- O foco continua sendo mutirão, WhatsApp e ação rápida.
