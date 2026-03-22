# Estado da Nação - Primeira importação real ANP

Data: 2026-03-22

## O que foi executado
- Arquivo oficial da ANP usado: `data/anp-cadastro.csv`
- Municípios alvo: Volta Redonda, Barra Mansa, Resende, Pinheiral, Porto Real, Quatis e Barra do Piraí
- Execução inicial: dry-run real no banco
- Execução final: importação controlada com enriquecimento geográfico via OSM/Nominatim

## Resumo executivo
- Linhas lidas no arquivo: 46020
- Linhas compatíveis com os municípios alvo: 110
- Criados na primeira carga real: 23
- Atualizados na reimportação com geocoding: 36
- Ignorados por duplicidade intra-arquivo: 0
- Conflitos/pendências de coordenada no último passe: 51
- Postos com geocoding bem-sucedido: 59
- Total de postos ANP presentes no banco após a execução: 133

## Distribuição por município
- Barra Mansa: 38
- Barra do Piraí: 19
- Pinheiral: 2
- Porto Real: 4
- Quatis: 4
- Resende: 24
- Volta Redonda: 42

## O que ficou funcional de verdade
- A base oficial de postos entrou no Supabase.
- O app passa a depender menos de seed manual para o Sul Fluminense.
- A deduplicação por CNPJ, identificador oficial e fallback lógico está ativa.
- O importador registra pendências em vez de falhar silenciosamente.
- O OSM ficou como apoio geográfico, não como fonte cadastral.

## Limitações encontradas
- Parte relevante dos registros da ANP não veio com coordenada precisa.
- O geocoder OSM/Nominatim resolveu 59 casos, mas 51 ainda ficaram sem coordenada confiável no último passe.
- Os postos sem coordenada confiável continuam exigindo um segundo tratamento de enriquecimento ou revisão manual.

## Riscos remanescentes
- Postos sem coordenada podem não aparecer corretamente no mapa se a UI não filtrar `lat/lng` inválidos.
- A base ainda pode precisar de enriquecimento manual para pontos mais difíceis.
- O Nominatim tem limite prático de uso e não deve virar dependência cega para a operação contínua.

## Próximos passos recomendados
1. Filtrar `lat/lng` inválidos no mapa e na lista pública.
2. Rodar um segundo passe só nos 51 casos pendentes, com revisão manual ou heurística específica.
3. Expandir a importação para cidades vizinhas depois que o Sul Fluminense estiver estável.
4. Registrar um pipeline de revisão de conflito para os casos sem coordenada precisa.
