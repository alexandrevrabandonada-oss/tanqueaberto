# Estado da Nação — Readiness por cidade

## O que foi criado

Foi adicionada uma camada simples de readiness por cidade para orientar o rollout do beta presencial sem depender de feeling.

O painel agora mostra:

- score de 0 a 100
- semáforo simples (`red`, `yellow`, `green`)
- recomendação operacional (`segurar`, `testar pequeno`, `pronta para ampliar`)
- postos visíveis
- postos com preço recente
- reports aprovados recentes
- feedback negativo
- erros de upload
- densidade de lacunas

## Critério aplicado

A regra continua deliberadamente simples:

- menos de 5 postos visíveis, menos de 3 postos com preço recente ou menos de 6 reports recentes: segurar
- score alto com feedback e upload sob controle: pronta para ampliar
- cenário intermediário: testar pequeno

## Leitura inicial

A prioridade operacional segue concentrada em Volta Redonda, Barra Mansa e Barra do Piraí.

O painel ajuda a evitar abertura prematura em cidade com base fraca e também a justificar ampliação quando a cobertura já está razoável.

## O que ainda depende de massa de dados

- score mais estável em cidades com pouco volume
- comparação temporal melhor quando houver mais reports por cidade
- sinais mais fortes de abandono e erro por cidade

## Riscos remanescentes

- cidades com pouco volume podem oscilar demais no score
- feedback negativo pequeno ainda pode distorcer cidades muito novas
- lacuna territorial não é o mesmo que ausência de preço recente

## Próximos passos recomendados

- revisar o score após mais dias de beta na rua
- priorizar coleta nos municípios com score intermediário
- usar o CSV de readiness como apoio para reunião operacional
- manter a regra simples até haver massa suficiente para refinamento