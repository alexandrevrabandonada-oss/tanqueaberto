# Estado da Nação - Telemetria e Feedback Beta

Data: 2026-03-22

## O que foi criado
- Telemetria de produto com eventos principais do beta: home, busca, posto, envio, auditoria e feedback.
- Coleta leve via `/api/telemetry`, com hash de IP e sem ampliar coleta de dados pessoais.
- Funil interno do beta no painel `/admin/ops`, mostrando entrada -> busca -> posto -> envio -> sucesso.
- Triagem de feedback com `screen_group`, `triage_tags` e `triage_status`.
- Export CSV para feedback, eventos e funil no painel interno.
- Painel operacional atualizado com telas mais acionadas, taxas de abandono e repetição de feedback.

## Como ficou a leitura operacional
- O produto agora mostra onde os testers entram, onde travam e onde o envio quebra.
- O feedback deixou de ser uma lista bruta e passou a ter agrupamento por tela, tipo e status.
- A operação consegue exportar os dados sem depender de ferramenta externa.

## O que ainda é provisório
- A telemetria continua intencionalmente simples e concentrada no beta.
- Não há pipeline externa de analytics ou dashboard dedicado fora do app.
- A triagem automática ajuda, mas ainda depende de revisão humana para decisões finais.
- O funil é bom para leitura de direção, não para inferência estatística pesada.

## Riscos remanescentes
- Volume baixo pode distorcer taxas e abandono.
- Eventos muito curtos podem parecer perda quando são apenas navegação rápida.
- Feedback repetido precisa de curadoria para não virar ruído operacional.

## Próximos passos recomendados
1. Usar esta telemetria durante o beta fechado e observar abandono real no envio.
2. Revisar semanalmente os feedbacks repetidos e as telas com mais atrito.
3. Se a base crescer, mover parte dessa leitura para resumos agregados no banco.
4. Adicionar alertas internos só depois de provar que o fluxo atual já está sendo usado de verdade.
