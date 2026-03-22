# ANP Ingestion

A base oficial de postos do Bomba Aberta deve vir da ANP. O OpenStreetMap entra apenas como apoio geográfico para coordenadas faltantes e como base cartográfica do mapa.

## Fluxo recomendado
1. Baixe ou exporte o cadastro oficial da ANP dos revendedores varejistas de combustíveis automotivos.
2. Salve o arquivo em CSV ou JSON.
3. Rode o importador com a lista de cidades do Sul Fluminense.
4. Se houver postos sem coordenadas, habilite o enriquecimento geográfico via OSM.

## Script
```bash
npm run import:anp -- --file ./data/anp-postos.csv --cities "Volta Redonda,Barra Mansa,Resende" --enrich-geo
```

Opções:
- `--file`: caminho para CSV ou JSON exportado da ANP.
- `--url`: URL do arquivo exportado, se você já tiver um link direto estável.
- `--cities`: lista separada por vírgula.
- `--dry-run`: simula sem gravar.
- `--enrich-geo`: usa OSM/Nominatim apenas para completar coordenadas faltantes.
- `--cache-file`: arquivo de cache local para geocoding.

## Regras de deduplicação
1. `cnpj`, quando disponível.
2. `source` + `source_id`, quando houver identificador oficial.
3. `nome + endereço + cidade + bairro` como fallback.

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

## Observações
- Não use dados de Google Maps, reviews ou fotos de plataformas fechadas.
- Não publique dados comunitários como se fossem cadastro oficial.
- A base da comunidade continua em `price_reports`.
- O mapa Leaflet já exibe atribuição do OpenStreetMap; mantenha isso visível.

## Curadoria territorial
Depois da importação, rode a auditoria territorial para separar postos aptos de postos em revisão.

```bash
npm run audit:stations -- --report reports/2026-03-22-estado-da-nacao-curadoria-territorial-da-base.md
npm run curate:stations -- --apply --report reports/2026-03-22-estado-da-nacao-curadoria-territorial-da-base.md
```

Leitura do resultado:
- `validCoordinates`: postos que podem aparecer no mapa.
- `invalidCoordinates`: postos escondidos da camada pública.
- `geo_review_status = ok`: coordenada e confiança aceitas.
- `geo_review_status = pending`: coordenada existe, mas ainda pede revisão.
- `geo_review_status = manual_review`: sem coordenada confiável.

A curadoria não altera preços comunitários, fotos ou histórico. Ela só melhora cadastro, visibilidade e prioridade operacional.

## Segunda passada geográfica
Depois da primeira importação, rode a segunda passada para melhorar cobertura territorial sem expor coordenadas fracas no mapa.

```bash
npm run regeo:stations -- --apply --report reports/territorial-geo-recheck.md
```

Leitura do resultado:
- `resolved`: casos com coordenada recuperada em qualidade suficiente para revisão leve.
- `pending`: coordenadas válidas, mas ainda em revisão.
- `manualReview`: casos que continuam frágeis e fora do mapa público.

O mapa público pode exibir coordenadas validadas e de confiança alta ou media, mas sempre oculta casos em `manual_review`.
