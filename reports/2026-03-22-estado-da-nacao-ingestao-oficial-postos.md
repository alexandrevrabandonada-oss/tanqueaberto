# Estado da Nação - Ingestão Oficial de Postos

Data: 2026-03-22

## Fonte usada
- ANP como fonte principal do cadastro dos postos.
- OpenStreetMap como apoio cartográfico e geográfico para enriquecimento de coordenadas quando necessário.
- A camada comunitária do Bomba Aberta continua separada em `price_reports`.

## O que foi criado
- Migration nova para ampliar `public.stations` com metadados oficiais e de ingestão.
- Normalizadores em `lib/normalizers/stations.ts`.
- Parser/importador ANP em `lib/importers/anp.ts`.
- Geocoding opcional via OSM/Nominatim em `lib/geo/osm.ts`.
- Script operacional de importação em `scripts/import-anp-stations.ts`.
- Documentação específica em `docs/anp-ingestion.md`.
- README atualizado com o fluxo de import, dedupe e regras de OSM.
- Página Sobre atualizada para deixar clara a separação ANP vs OSM vs dados comunitários.

## Municípios preparados
- Volta Redonda
- Barra Mansa
- Resende
- Pinheiral
- Porto Real
- Quatis
- Barra do Piraí

## Campos aproveitados
- `cnpj`
- `source`
- `source_id`
- `official_status`
- `sigaf_status`
- `products`
- `distributor_name`
- `last_synced_at`
- `import_notes`
- `geo_source`
- `geo_confidence`
- `is_active`

## Estratégia de deduplicação
1. `cnpj`, quando disponível.
2. `source` + `source_id`, quando houver identificador oficial.
3. `nome + endereço + cidade + bairro` como fallback.

## Totais desta etapa
- Import oficial executado nesta sessão: `0`.
- Motivo: o arquivo exportado oficial da ANP não foi fornecido no workspace, então a pipeline foi preparada e validada, mas não rodada com massa real ainda.

## Conflitos e limitações
- O importador depende do formato do arquivo oficial da ANP, mas o parser foi feito para tolerar CSV e JSON com cabeçalhos variados.
- Postos sem coordenada só entram se o enriquecimento OSM estiver habilitado ou se vierem com latitude/longitude na fonte.
- OSM não é fonte cadastral, só apoio geográfico.
- A precisão do geocoding depende da qualidade do endereço oficial.

## O que ainda depende de enriquecimento manual
- Casos sem coordenada e sem boa resolução geográfica.
- Normalização fina de bandeira/distribuidora em arquivos ANP com nomenclaturas inconsistentes.
- Revisão humana de linhas com conflito entre CNPJ, nome e endereço.

## Próximos passos recomendados
- Rodar um dry-run com o arquivo oficial exportado da ANP.
- Importar por município e revisar conflitos.
- Fazer um primeiro sync real com cache de geocoding ativo.
- Depois do cadastro oficial estabilizado, substituir seeds manuais por massa ANP real.
- Avaliar um fluxo interno no admin para disparar sync documentado, sem abrir demais a superfície de escrita.
