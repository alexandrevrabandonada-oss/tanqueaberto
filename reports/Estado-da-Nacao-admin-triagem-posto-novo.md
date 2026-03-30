# Estado da Nação: admin triagem de posto novo

## Resumo executivo
A fila administrativa do fluxo "nao achei meu posto" foi reorganizada para moderacao rapida e segura. A tela agora prioriza postos bons, conflitos de duplicidade, propostas sem geo e propostas muito vagas, com acao rapida direta em cada card.

## O que mudou
- A fila territorial ganhou quatro leituras principais no topo: boa para aprovar rapido, duplicidade provavel, sem geo e muito vaga.
- Cada item agora mostra sinais de risco claros: nome generico, sem rua/trecho, sem geo e duplicidade provavel.
- A acao rapida do item ficou mais objetiva:
  - aprovar rapido
  - marcar revisar
  - rejeitar
  - vincular a posto existente/duplicado
- O vinculo de duplicidade agora persiste em `duplicate_of_station_id` e fica registrado na nota operacional da curadoria.
- O resumo por cidade continua disponivel para operacao em lote, mas sem esconder a triagem por prioridade.

## Antes / Depois
Antes:
- A revisao territorial era uma fila unica sem leitura compacta de prioridade.
- Havia apenas promover, ajustar e ocultar.
- Duplicidade era percebida tarde ou tratada de forma indireta.
- Nao havia persistencia explicita do posto canonical vinculado.

Depois:
- A tela separa os itens por prioridade operacional.
- Duplicidade vira uma acao de primeira classe, com sugestoes de posto parecido.
- O admin enxerga a fila em leitura curta antes de abrir os cards.
- O vinculo duplicado passa a ficar persistido e auditavel.

## Arquivos principais
- [components/admin/ops/territorial-curation-panel.tsx](C:/Projetos/Tanque%20Aberto/components/admin/ops/territorial-curation-panel.tsx)
- [app/admin/ops/qualidade/page.tsx](C:/Projetos/Tanque%20Aberto/app/admin/ops/qualidade/page.tsx)
- [app/admin/actions.ts](C:/Projetos/Tanque%20Aberto/app/admin/actions.ts)
- [lib/ops/territorial-curation.ts](C:/Projetos/Tanque%20Aberto/lib/ops/territorial-curation.ts)
- [supabase/migrations/20260330_022_station_duplicate_link.sql](C:/Projetos/Tanque%20Aberto/supabase/migrations/20260330_022_station_duplicate_link.sql)

## Validacao
- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou

## Leitura operacional
- `boa_rapida`: pode ir direto se nao houver duplicidade.
- `duplicidade provavel`: vincular ou rejeitar antes de aprovar.
- `sem geo`: revisar sinal minimo antes de promover.
- `muito vaga`: precisa de mais dado, nao deve virar posto publico sem leitura.
