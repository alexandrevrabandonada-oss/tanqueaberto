# Estado da Nação — Painel editorial de lacunas

## O que entrou
- Painel editorial novo no `/admin/ops`, acima da fila de nomes e curadoria territorial.
- Leitura por cidade, bairro, grupo e combustível para apontar onde a base está mais vazia.
- Score operacional simples com três saídas: `vale pedir coleta já`, `pode esperar` e `precisa revisar base primeiro`.
- Resumo diário copiável para reunião operacional.
- Export CSV dedicado em `/admin/ops/export?kind=gaps`.
- Ponte leve com convites, sugerindo cidades prioritárias para lotes de testers.

## O que o painel mostra
- Top 10 lacunas combinando cidade, bairro, grupo e combustível.
- Cidades com lacuna alta e filas de coleta prioritária.
- Bairros com postos visíveis sem preço recente.
- Grupos territoriais com baixa densidade ou sem leitura recente.
- Combustíveis mais faltantes no recorte.
- Feedback repetido, erros recorrentes e cidades que melhoraram ou pioraram na janela curta.

## O que ainda é provisório
- O score continua simples e editorial, não um modelo estatístico.
- A leitura por bairro e grupo depende da qualidade da base territorial existente.
- A ponte com convites é sugestão operacional, não automação de distribuição.

## Riscos remanescentes
- Se a base territorial estiver fraca em uma cidade, o painel pode apontar revisão antes de coleta, o que é esperado.
- O sinal de combustível faltante é útil para direção, mas ainda não substitui uma cobertura fina por posto e por recorte.
- O CSV é de reunião operacional, não de auditoria analítica profunda.

## Validação
- `npm run typecheck`
- `npm run lint`
- `npm run build`
