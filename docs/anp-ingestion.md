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
