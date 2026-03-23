# Estado da Nação - Beta ops menos manual

Data: 2026-03-22

## O que foi automatizado
- A gestão de convites beta passou a ser feita no painel `/admin/ops`, com criação de códigos, lote, usos máximos, expiração opcional e desativação.
- O beta agora aceita convites do banco em `beta_invite_codes`, mantendo o fallback por `BETA_INVITE_CODE` para continuidade.
- A triagem de feedback ganhou campos de `triage_topic` e `triage_priority`, além de ações rápidas para marcar itens como novo, em análise ou resolvido.
- O painel operacional ganhou sinais diários com testers ativos, envios iniciados e concluídos, feedbacks novos e alertas internos mínimos.
- Exportes CSV novos foram adicionados para `feedback`, `events`, `ops` e `invites`.

## O que segue manual
- A leitura dos alertas ainda é operacional, não automática no sentido de bloquear nada.
- A triagem de feedback depende da revisão humana para confirmar prioridade e fechamento.
- A distribuição dos convites continua manual fora do app, embora a geração e o controle estejam no painel.
- A expansão do beta para mais cidades ainda depende de curadoria e decisão editorial.

## Onde a operação ficou mais forte
- O grupo beta deixa de depender só de um código fixo em env.
- O painel passa a mostrar sinais de uso e cobertura sem exigir varredura manual de tabelas.
- O feedback deixa de ser só uma lista cronológica e passa a ter tema, prioridade e estado de triagem.
- O time operacional ganha CSV pronto para leitura externa e acompanhamento fora do app.

## Riscos remanescentes
- Os alerts internos ainda são heurísticos e dependem de massa mínima para ficar confiáveis.
- A contagem de testers ativos hoje usa sinais anônimos/privacidade-preservados e deve ser lida como aproximação operacional.
- O beta continua sem offline-first completo; rede ruim ainda pode prejudicar o envio em campo.
- O painel de convites é simples por desenho; ele resolve o beta fechado, mas não substitui um sistema de acesso mais sofisticado.

## Próximos passos recomendados
- Criar uma rotina semanal para revisar `alerts` e `feedback` de maior prioridade.
- Priorizar as cidades com cobertura mais fraca antes de abrir novos convites.
- Ligar o CSV operacional a um fluxo de revisão recorrente da equipe.
- Se o beta crescer, adicionar validade por lote, revisão de uso por convite e um painel de lacunas mais editorial.
