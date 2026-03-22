# Estado da Nação - Curadoria territorial da base

## Resumo executivo

A base oficial de postos do Sul Fluminense passou pela primeira varredura de curadoria territorial.

- Postos no recorte: 114
- Postos aptos para mapa público com coordenada válida: 51
- Postos sem coordenada confiável e ocultados do mapa: 63
- Postos em `geo_review_status = ok`: 12
- Postos em `geo_review_status = pending`: 39
- Postos em `geo_review_status = manual_review`: 63
- Suspeitas de duplicidade forte: 0
- Enderecos incompletos: 0
- Nomes genéricos ou ruidosos: 63

## Leitura territorial por município

| Municipio | Total | Coordenada valida | Coordenada invalida |
| --- | ---: | ---: | ---: |
| Volta Redonda | 42 | 22 | 20 |
| Barra Mansa | 38 | 19 | 19 |
| Resende | 24 | 5 | 19 |
| Barra do Pirai | 19 | 8 | 11 |
| Porto Real | 4 | 2 | 2 |
| Quatis | 4 | 2 | 2 |
| Pinheiral | 2 | 1 | 1 |

## O que foi aplicado

- `name_public` foi normalizado para reduzir ruído visual no app.
- `name_official` foi preservado como trilha de auditoria.
- `geo_review_status` foi preenchido para separar `ok`, `pending` e `manual_review`.
- `visibility_status` e `priority_score` foram atualizados para preparar priorizacao editorial e operacional.
- A UI pública passou a ignorar coordenadas inválidas no mapa.
- O badge de revisão territorial agora aparece só quando a localização é realmente problemática, sem poluir a navegação com alerta excessivo.

## O que continua pendente

- 63 postos ainda não têm coordenada confiável para mapa público.
- 39 postos têm coordenada válida, mas confiança geográfica baixa, então ainda pedem revisão territorial.
- O corte por nome ainda tem muito ruído cadastral da ANP e precisa de limpeza fina antes de virar uma camada editorial forte.
- A base ainda não tem uma faixa útil de reports aprovados amarrados aos postos desta região.

## Riscos remanescentes

- Exibir postos sem coordenação confiável no mapa pode piorar a leitura pública, por isso esses casos continuam ocultos da camada cartográfica.
- Sem uma segunda passada de geocoding e revisão manual, a região vai continuar com densidade desigual entre cidades.
- Os nomes genéricos podem atrapalhar busca e percepção de qualidade se não forem tratados com mais regra de padronização.
- Barra do Pirai exige normalizacao de acento/variante textual nas consultas e relatórios.

## Próximos passos recomendados

1. Rodar uma segunda passagem de enriquecimento geográfico só nos 63 casos sem coordenada confiável.
2. Criar uma fila manual assistida para revisar os 39 postos com coordenada válida, mas confiança baixa.
3. Endurecer a normalizacao de nomes públicos por municipio e distribuidora.
4. Criar uma visao de curadoria no admin para marcar postos como revisados sem editar o cadastro bruto.
5. Fechar uma rotina recorrente de auditoria territorial por cidade antes de ampliar o Sul Fluminense.

## Observacao operacional

O mapa público hoje fica mais confiável porque só exibe postos com coordenada válida. A base ainda nao está pronta para parecer homogênea em toda a regiao, mas já está suficientemente limpa para beta territorial controlado.
