# Estado da Nacao: operacao da confianca progressiva

## Diagnostico curto

O motor de confianca progressiva ja existia e a rota de envio ja gravava sinais suficientes de confianca, risco e saida operacional. O gargalo estava em outro lugar: a operacao ainda nao tinha uma leitura clara de fila, impacto e rollout. Isso dificultava confiar no fast-lane, limitava a auditabilidade da autoaprovacao e deixava configuracoes relevantes espalhadas em `sys_config` e kill switches sem uma superficie operacional dedicada.

Nesta passada, o foco saiu da modelagem e foi para a operacao segura:

- Fase 2 passa a ser o caminho padrao quando nao ha override explicito
- fast-lane fica tratada como trilha operacional de verdade
- autoaprovacao continua controlada, visivel e auditavel
- kill switch geral permite voltar o motor para revisao humana total sem deploy
- admin/ops passa a mostrar fila, explicabilidade e impacto em uma rotina legivel

## Patch completo

### 1. Painel operacional da confianca

Foi criada uma leitura operacional dedicada para confianca progressiva em `admin/ops`, alimentada por um readout server-side novo em `lib/ops/progressive-trust-operations.ts`.

O painel agora mostra:

- quantos envios caem em `review_normal`
- quantos envios entram em `fast_lane`
- quantos envios saem como `auto_approved`
- quantos autoaprovados foram corrigidos depois
- taxa de correcao por faixa de confianca
- taxa de correcao por faixa de risco
- regressao de qualidade por fase do rollout

### 2. Leitura clara da fila

O painel operacional agora separa quatro leituras de fila:

- fast-lane pendente
- alto risco pendente
- autoaprovados recentes
- autoaprovados corrigidos depois

Tambem agrega os principais motivos que continuam derrubando envio para revisao normal, para a moderacao entender rapidamente onde o motor esta conservador e por que.

### 3. Controle de rollout

Foi criado um painel de rollout explicito para confianca progressiva em `admin/ops` com:

- fase atual do motor
- fast-lane ligada/desligada
- autoaprovacao ligada/desligada
- kill switch geral do progressive trust
- leitura separada entre estado configurado e estado efetivo

O rollout continua respeitando os guardrails do motor:

- Fase 1: shadow
- Fase 2: fast-lane
- Fase 3: autoaprovacao limitada

Mesmo com toggle visivel, a autoaprovacao so entra em efeito operacional quando a fase e 3, mantendo a semantica do rollout e evitando liberacao geral acidental.

### 4. Explainability no admin

O admin ja tinha parte da explicabilidade, mas foi reforcado para a operacao de verdade:

- a fast-lane do admin agora mostra apenas itens realmente `fast_lane`
- cada item da fila rapida exibe motivo principal da rota e do risco
- a tela de detalhe do report ganhou leitura da fase do rollout e do motivo principal da rota

Com isso, para cada report operado no admin, fica curto e legivel:

- nivel de confianca do colaborador
- nivel de risco do envio
- rota escolhida
- motivo principal da rota
- historico curto do colaborador

### 5. Telemetria e impacto

O readout operacional passou a medir, na janela recente:

- reducao estimada da fila por autoaprovacao controlada
- share de fast-lane no volume recente
- tempo medio de aprovacao em fast-lane
- taxa de erro dos autoaprovados
- carga manual ainda aberta
- comparacao de qualidade por fase do rollout

### 6. Seguranca mantida

Os guardrails centrais permaneceram no motor e continuam efetivos:

- posto novo continua fora da autoaprovacao
- geolocalizacao fraca continua empurrando revisao
- fluxo sem placa/faixa continua em revisao humana reforcada
- casos contraditorios continuam fora de publicacao automatica

Foi adicionado tambem um kill switch geral `disable_progressive_trust`, com leitura visivel no ops e suporte no motor para voltar imediatamente ao modo review-only.

### 7. Configuracao operacional e migracao

Foi adicionada a migracao `20260404_029_progressive_trust_operations.sql` para:

- semear `progressive_trust_rollout` com Fase 2 como baseline seguro
- completar a configuracao com `fastLaneEnabled` e `autoApprovalEnabled`
- incluir `disable_progressive_trust` na familia de kill switches

## Antes e depois

### Antes

- o motor de confianca progressiva existia, mas a operacao nao tinha leitura agregada da fila e do impacto
- fast-lane aparecia de forma difusa, sem uma fila operacional claramente separada
- autoaprovacao corrigida depois era auditada, mas nao tinha painel proprio de acompanhamento
- fase, toggles e kill switch do progressive trust nao estavam concentrados numa superficie obvia
- a moderacao via fast queue ainda podia misturar itens que nao eram realmente fast-lane

### Depois

- `admin/ops` ganhou um painel operacional claro da confianca progressiva
- a fila agora separa fast-lane pendente, alto risco pendente, autoaprovados recentes e corrigidos depois
- o rollout ficou operavel na UI: fase, fast-lane, autoaprovacao e kill switch geral
- a explainability ficou curta e repetivel na rotina de moderacao
- a carga manual passa a ser medida com leitura de alivio de fila e regressao por rollout
- a fast queue do admin passou a operar sobre itens realmente `fast_lane`

## Validacao executada

Executado com sucesso:

- `npm run typecheck`
- `npm run build`
- `npm run verify`

Resultado do `verify`:

- schema drift passou
- lint passou
- typecheck passou
- build passou

Observacao operacional remanescente do ambiente local:

- faltam envs recomendados `STATION_EDITOR_SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL` e `NEXT_PUBLIC_APP_URL`

Esses envs nao bloquearam build, typecheck nem verify, mas continuam como follow-up recomendado do auditor do projeto.