# Estado da Nação: triagem rápida do posto novo

## Diagnóstico
- A classificação da proposta já existia, mas a tela ainda não deixava claro o que revisar primeiro.
- A fila estava organizada como lista longa, com decisão, risco e duplicidade misturados na leitura inicial.
- Faltava um resumo compacto no topo para priorizar `aprovar rápido`, `conflito/duplicidade`, `sem geo` e `muito vaga`.

## O Que Mudou
- O topo da página de qualidade ganhou um resumo operacional curto com quatro sinais principais e a fila total.
- A fila territorial passou a abrir por blocos mais nítidos:
  - `Aprovar rápido`
  - `Conflito / duplicidade`
  - `Sem geo`
  - `Muito vaga`
  - `Precisa revisar`
- Cada item agora destaca, de forma compacta:
  - estado de geo
  - risco de duplicidade
  - nome genérico
  - rua/trecho ausente
  - confiança baixa
- As ações rápidas por item continuam no próprio card:
  - `Aprovar rápido`
  - `Marcar revisar`
  - `Rejeitar`
  - `Vincular duplicado`

## Antes / Depois
- Antes: fila longa, com leitura operacional espalhada.
- Depois: painel de decisão rápida com grupos visuais, sinais críticos e ações no próprio item.
- Antes: a duplicidade dependia mais da leitura manual do card.
- Depois: a duplicidade ficou explícita no topo da fila e no card individual.

## Validação
- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou

## Escopo
- O fluxo público ficou intocado.
- O ajuste foi só no backoffice de triagem.
