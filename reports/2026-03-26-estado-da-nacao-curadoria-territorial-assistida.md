# Estado da Nação — Curadoria Territorial Assistida

Data: 2026-03-26

## Objetivo
Transformar a pendência territorial em fluxo operacional dentro do admin/ops, reduzindo a dependência de revisão manual solta e melhorando a confiança do mapa e da busca.

## O que foi entregue
- Fila geográfica assistida com prioridade automática.
- Ações rápidas por posto: aprovar, ajustar, manter oculto.
- Ações em lote por cidade e por bairro.
- Botão de promoção para mapa condicionado a critérios mínimos.
- Resumo operacional por cidade com relatório copiável.
- Telemetria operacional para acompanhar revisão e promoção.

## Arquivos principais
- [lib/ops/territorial-curation.ts](C:/Projetos/Tanque%20Aberto/lib/ops/territorial-curation.ts)
- [components/admin/ops/territorial-curation-panel.tsx](C:/Projetos/Tanque%20Aberto/components/admin/ops/territorial-curation-panel.tsx)
- [app/admin/actions.ts](C:/Projetos/Tanque%20Aberto/app/admin/actions.ts)
- [app/admin/ops/qualidade/page.tsx](C:/Projetos/Tanque%20Aberto/app/admin/ops/qualidade/page.tsx)

## Como a fila funciona
A fila assistida consolida os postos que precisam de intervenção territorial e ordena por prioridade com base em:
- ausência de coordenada válida
- confiança geográfica baixa
- estado `manual_review`
- cidade prioritária do beta
- nome público genérico
- fonte geográfica manual

O painel mostra para cada posto:
- nome público
- endereço
- bairro e cidade
- coordenada atual
- confiança
- fonte geográfica
- motivo de prioridade
- ação rápida de curadoria

## Regra de promoção ao mapa
Um posto só pode ser promovido para o mapa quando atende ao mínimo:
- coordenada válida
- confiança `medium` ou `high`
- `geo_review_status = ok`

Se qualquer item de um lote não cumprir o mínimo, a promoção em lote é bloqueada.

## Curadoria em lote
O fluxo agora cobre duas escalas:
- por cidade: promove ou oculta a cidade inteira, com resumo copiável
- por bairro: promove ou oculta o lote do bairro dentro da cidade

## Telemetria operacional
Eventos adicionados para acompanhar a operação:
- revisão territorial por item
- promoção por cidade
- ocultação por cidade
- bloqueio por critério mínimo
- cópia do relatório de cidade
- falha de atualização

## Resumo por cidade
O painel gera automaticamente um resumo por cidade com:
- total na fila
- quantos são promovíveis
- sem coordenada
- baixa confiança
- ocultos

Esse resumo pode ser copiado para operação de rua e acompanhamento manual.

## Estado do build
- `npm run build` passou
- Persistem apenas warnings antigos de hooks em componentes já conhecidos
- A rota `/hub` continua com aviso dinâmico já conhecido do projeto

## Pendências remanescentes
- Não foi gerada uma rodada nova de screenshots nesta passagem.
- O fluxo territorial está pronto no admin/ops, mas a qualidade final da base depende da equipe executar a fila assistida com regularidade.

## Leitura final
A curadoria territorial saiu de um estado de revisão solta para uma trilha operacional com:
- prioridade objetiva
- lote por cidade e bairro
- promoção segura ao mapa
- rastreabilidade por sessão e por cidade