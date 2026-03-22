# Estado da Nação - Segunda curadoria geográfica

## Resumo executivo

A segunda passada territorial foi aplicada no Sul Fluminense com foco em recuperar coordenadas pendentes, normalizar nomes públicos e manter o mapa conservador.

- Postos no recorte: 133
- Coordenadas com base válida e status público aceitável (`ok` + `pending`): 73
- Coordenadas em revisão manual (`manual_review`): 60
- Postos com `geo_review_status = ok`: 12
- Postos com `geo_review_status = pending`: 61
- Postos com `geo_review_status = manual_review`: 60
- Nomes públicos normalizados na passada: 28
- Casos recuperados do cache local nesta execução: 4
- Municípios processados: Volta Redonda, Barra Mansa, Resende, Barra do Piraí, Porto Real, Quatis, Pinheiral

## Antes e depois

| Indicador | Antes | Depois |
| --- | ---: | ---: |
| Coordenadas válidas para circulação pública moderada (`ok` + `pending`) | 51 | 73 |
| Casos em revisão manual | 63 | 60 |
| Postos com nome público padronizado | 0 | 28 |

## Leitura territorial por município

| Municipio | Total | Ok | Pending | Manual review | Coordenada válida para revisão |
| --- | ---: | ---: | ---: | ---: | ---: |
| Volta Redonda | 42 | 5 | 21 | 16 | 26 |
| Barra Mansa | 38 | 6 | 13 | 19 | 19 |
| Resende | 24 | 0 | 5 | 19 | 5 |
| Barra do Pirai | 19 | 0 | 17 | 2 | 17 |
| Porto Real | 4 | 1 | 2 | 1 | 3 |
| Quatis | 4 | 0 | 2 | 2 | 2 |
| Pinheiral | 2 | 0 | 1 | 1 | 1 |

## O que mudou

- A base recebeu uma segunda passada de curadoria territorial.
- A rotina de cache passou a aceitar match por nome e por sufixo de endereço/cidade/bairro.
- A base ganhou normalização mais forte de `name_public` para melhorar leitura no app.
- A área admin passou a exibir uma fila de revisão territorial com edição manual de nome público, coordenada, fonte geográfica, confiança e observação.
- O mapa continua conservador: casos frágeis seguem ocultos da visualização principal.

## O que ainda continua crítico

- 60 postos ainda estão em `manual_review`.
- Há forte concentração de revisão em Resende, Quatis e Pinheiral.
- A base ainda depende de revisão manual quando não há correspondência segura no cache.
- Nomes oficiais brutos continuam ruidosos em parte da base ANP; o nome público melhora a leitura, mas não substitui a trilha oficial.

## Riscos remanescentes

- Se a visibilidade pública for afrouxada demais, a qualidade do mapa cai rápido.
- O cache resolve parte da base, mas não substitui uma rodada de geocoding online quando a rede estiver confiável.
- A revisão manual precisa ser usada para fechar casos frágeis antes de liberar mais densidade no mapa.

## Próximos passos recomendados

1. Rodar uma terceira passada online quando o Nominatim estiver estável, só para os 60 casos em revisão manual.
2. Priorizar Barra do Piraí, Volta Redonda e Barra Mansa para fechamento de cobertura.
3. Aplicar revisão manual assistida nos municípios com menos cobertura útil.
4. Manter o mapa conservador até a base subir a confiança dos casos pendentes.
5. Repetir a auditoria territorial após cada lote de revisão.

## Observacao operacional

O resultado desta etapa é melhor para operação do que para volume bruto: a base ficou mais legível, a fila de revisão ficou acionável e a cobertura territorial revisável subiu de 51 para 73 sem sacrificar o critério de confiança.
