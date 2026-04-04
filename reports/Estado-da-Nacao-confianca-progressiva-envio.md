# Estado da Nacao: confianca progressiva no envio

## Diagnostico curto

O fluxo de envio ja tinha endurecimento suficiente para separar sinais de confianca do colaborador e risco do envio, mas a decisao operacional ainda era praticamente binaria: tudo dependia de revisao humana. Isso mantinha a fila cara, atrasava contribuidores bons e nao aproveitava o historico ja auditavel de aprovacoes, rejeicoes, recorrencia territorial, qualidade de geolocalizacao e aderencia ao posto.

A passada implementa confianca progressiva com tres principios:

- confianca do colaborador e avaliada separadamente do risco do envio
- nenhum colaborador ganha liberacao cega
- autoaprovacao so existe em fase de rollout especifica e apenas para envio de baixo risco

## Patch completo

### 1. Motor de confianca progressiva

Arquivo: `lib/ops/progressive-trust.ts`

Foi criado um motor operacional novo para:

- derivar nivel de confianca `N0`, `N1`, `N2` e `N3`
- calcular razoes auditaveis do nivel
- resumir historico curto de acertos e erros
- avaliar risco do envio em `low`, `medium` e `high`
- decidir a saida operacional em `review_normal`, `fast_lane` ou `auto_approved`
- respeitar rollout progressivo via `sys_config.progressive_trust_rollout`
- manter `disable_fast_lane` como kill switch de seguranca

Sinais usados na confianca:

- volume de aprovacoes e rejeicoes
- score e stage ja existentes em `collector_trust`
- recorrencia do aparelho e da sessao
- consistencia no posto e na cidade
- proporcao de geolocalizacao forte
- historico recente do colaborador

Sinais usados no risco do envio:

- posto novo ou sob revisao
- geolocalizacao ausente ou fraca
- duplicidade ou reuso de foto
- discrepancia forte com historico recente
- primeiro envio no posto
- primeiro envio em territorio novo
- contexto de identidade fraco ou contraditorio

### 2. Decisao operacional no envio

Arquivo: `app/enviar/actions.ts`

O submit agora:

- monta o perfil de confianca do colaborador antes de gravar
- avalia o risco especifico do envio
- decide a rota operacional conforme a fase de rollout
- grava essa decisao no `metadata` do report
- aprova automaticamente apenas quando a fase permite e o risco e baixo
- envia para fast-lane quando o colaborador e forte, mas ainda nao e caso de publicacao automatica
- mantem revisao normal para casos sensiveis

Metadados gravados no report:

- `contributor_trust_level`
- `contributor_trust_score`
- `contributor_trust_reasons`
- `contributor_history_summary`
- `submission_risk_level`
- `submission_risk_reasons`
- `submission_routing`
- `submission_routing_reasons`
- `progressive_trust_rollout_phase`
- `progressive_trust_rollout_label`

Eventos operacionais adicionados:

- `progressive_trust_fast_laned`
- `progressive_trust_auto_approved`
- `progressive_trust_auto_approved_corrected`

### 3. Priorizacao de moderacao

Arquivo: `lib/ops/moderation-priority.ts`

A fila agora considera:

- saida operacional do report
- risco do envio
- nivel de confianca do colaborador

Com isso, itens de fast-lane sobem na fila, e itens de alto risco continuam pressionados para revisao humana primeiro.

### 4. Admin e moderacao

Arquivos:

- `lib/data/queries.ts`
- `app/admin/page.tsx`
- `components/admin/fast-approval-queue.tsx`
- `app/admin/reports/[reportId]/page.tsx`
- `app/admin/actions.ts`

O admin agora mostra:

- nivel de confianca do colaborador
- motivo principal do nivel
- nivel de risco do envio
- motivo principal do risco
- saida operacional aplicada
- historico curto de acertos e erros

Tambem foi ligado o fluxo de correcao posterior para casos autoaprovados: quando um autoaprovado e depois corrigido ou rejeitado, o evento fica auditado e alimenta a leitura de qualidade do rollout.

### 5. Tipos compartilhados

Arquivo: `lib/types.ts`

Foram adicionados tipos explicitos para:

- `ContributorTrustLevel`
- `SubmissionRiskLevel`
- `SubmissionRouting`

E os reports enriquecidos passaram a carregar os campos derivados de confianca, risco e roteamento.

## Rollout

A implementacao foi desenhada para ativacao progressiva:

### Fase 1

- score e nivel calculados
- sem efeito operacional
- serve para calibracao, leitura e auditoria

### Fase 2

- fast-lane habilitada
- autoaprovacao ainda desligada
- reduz fila sem abrir publicacao automatica

### Fase 3

- autoaprovacao limitada habilitada
- apenas para colaborador forte e envio de baixo risco
- casos sensiveis continuam em revisao

## Telemetria e leitura operacional

A passada deixa medicao pronta para responder:

- quantos envios foram para fast-lane
- quantos foram autoaprovados
- quantos autoaprovados precisaram correcao posterior
- impacto sobre a fila de moderacao
- regressao de qualidade por faixa de confianca

## Antes e depois

### Antes

- quase todo envio dependia de revisao humana
- colaborador recorrente e colaborador novo tinham saida operacional parecida
- risco do envio nao era explicitado para moderacao
- nao havia telemetria propria para fast-lane e autoaprovacao limitada

### Depois

- o sistema calcula nivel de confianca auditavel por colaborador
- o sistema calcula risco do envio separadamente
- cada report recebe uma saida operacional explicita
- fast-lane passa a existir como camada intermediaria
- autoaprovacao fica limitada por rollout e risco baixo
- admin enxerga o porque da decisao, nao apenas o status final
- correcao posterior de autoaprovados fica mensuravel

## Validacao

Executado com sucesso:

- `npm run typecheck`
- `npm run build`
- `npm run verify`

Observacao operacional do `verify`:

- os envs recomendados `STATION_EDITOR_SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL` e `NEXT_PUBLIC_APP_URL` continuam ausentes no ambiente local, mas nao bloquearam typecheck, build nem verify
