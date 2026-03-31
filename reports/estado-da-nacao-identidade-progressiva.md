# Estado da Nação - Identidade Progressiva

## Objetivo
Definir uma identidade progressiva para o Bomba Aberta sem exigir login antes do primeiro entendimento do produto ou do primeiro envio.

A regra central desta proposta é simples:
- entrada publica continua aberta;
- identidade aparece por necessidade de continuidade, reputacao ou beta fechado;
- admin/ops continua isolado com autenticacao forte.

## Auditoria Do Que Ja Existe

### Reputacao
Existe um sistema real de reputacao em `lib/ops/collector-trust.ts` e `components/user/utility-status-card.tsx`:
- `trustStage`: `novo`, `confiável`, `muito_confiável`, `em_revisão`, `bloqueado`.
- `score`, `streakDays`, `missionsCompleted`, `approvedReports`, `rejectedReports`.
- `cohort`: `NEWBIE`, `EXPERT`, `VETERAN`, `ALPHA`.
- `isTester` existe como sinal persistido na tabela de trust.

Isso já funciona como identidade progressiva implícita, mas ainda mistura:
- utilidade do colaborador;
- acesso de tester;
- leitura operacional;
- e decisão de produto.

### Coortes / Tester
Existe uma trilha clara de beta/tester:
- `lib/beta/invites.ts` gerencia convites/códigos.
- `lib/beta/access.ts` valida token de acesso.
- `lib/beta/session.ts` grava cookie persistente `bomba_aberta_beta_access`.
- `hooks/use-test-mode.ts` liga modo tester quando `trust.isTester` é verdadeiro.
- `app/admin/ops/components/tester-monitor-panel.tsx` e `app/admin/ops/actions.ts` tratam coortes e monitoramento.

Hoje, a coorte é mais forte que a identidade leve, mas ela vive mais como mecanismo de beta/ops do que como UX progressiva para o colaborador comum.

### Beta Gate
O gate beta está em `lib/beta/gate.ts` e `middleware.ts`.

Estado atual importante:
- o beta fechado protege `\/beta` e `\/beta/*` e `\/feedback`.
- o cookie de beta é persistente.
- a home, hub, atualizar e enviar continuam acessíveis sem login.

O gate já separa acesso por superfície, mas não resolve por si só a progressão de identidade do colaborador.

### Hub
O Hub hoje junta:
- `useMySubmissions()` para histórico local de envios;
- `useStreetSession()` para continuidade local;
- `useStreetMode()` para memória curta e favoritos;
- `getCollectorTrustAction(reporterNickname)` para trust/score;
- `getCollectorTerritorialImpactAction(reporterNickname)` para impacto territorial;
- fila local em `lib/queue/submission-queue.ts`;
- rascunho em `lib/drafts/submission-draft.ts`.

Isso já forma um funil de identidade progressiva real, mas os gatilhos ainda são indiretos: o Hub percebe comportamento, não uma identidade explicitamente declarada em fases.

### Trust Score
`lib/ops/collector-trust.ts` faz a ponte mais forte entre comportamento e reconhecimento:
- score sobe e desce com moderação;
- streak cria continuidade;
- `getUtilityStatus()` traduz isso em papel operacional.

Na prática, o trust já funciona como identidade reconhecida. Falta só assumir isso como etapa explícita do produto.

### Fila / Moderação
A fila local e a moderação já separam bem o que é imediato do que é validado:
- `components/forms/submission-queue-panel.tsx` mostra fila local e estados.
- `app/enviar/actions.ts` envia sem exigir conta tradicional.
- `app/actions/user.ts` e `app/hub/actions.ts` dependem de nickname/IP e contexto, não de login clássico.

Ou seja: o produto já permite uso sem conta. O problema é organizar essa ausência de conta como uma progressão legível.

## Proposta De Identidade Em Fases

### 1. Visitante aberto
Perfil:
- entra no app sem fricção;
- lê mapa, postos, atualizações e entendimento inicial;
- ainda não se comprometeu com identidade.

Sinais permitidos:
- comportamento de navegação;
- sessão local;
- rascunho;
- fila local.

UX:
- sem pedido de login;
- sem overlay de cadastro;
- apenas pistas leves de continuidade.

### 2. Colaborador guest
Quando entra:
- após o primeiro envio;
- ou após um segundo/terceiro retorno útil;
- ou quando tenta manter fila, retorno ou histórico entre sessões.

Identidade leve recomendada:
- apelido persistente local;
- opcionalmente apelido usado no envio;
- memória do navegador e sessão local como base.

O que esse estágio precisa fazer:
- tornar o `apelido` uma âncora de reputação, sem virar conta tradicional;
- permitir que o Hub reconheça continuidade sem pedir cadastro completo;
- criar um caminho de “me reconheça depois” sem travar o primeiro envio.

### 3. Colaborador reconhecido
Entra quando:
- trust/score já existe;
- há repetição de envios ou missão;
- há retorno consistente e fila ativa;
- a pessoa começa a gerar impacto territorial.

Identidade recomendada:
- apelido persistente + trust score;
- badge de utilidade/corpus operacional;
- eventualmente “código de colaborador” para migração entre dispositivos ou suporte.

Função:
- mostrar que o colaborador já tem lastro;
- permitir personalização sem exigir senha;
- abrir recursos contextuais melhores no Hub.

### 4. Tester / beta
Entra quando:
- há convite válido;
- há cookie beta persistente;
- há coorte ativa em `collector_trust`.

Identidade recomendada:
- convite/código simples;
- cookie persistente;
- eventual magic link se o produto precisar de troca de dispositivo sem atrito.

Função:
- liberar superfícies fechadas;
- habilitar feedback e telemetria de teste;
- não substituir a identidade progressiva do colaborador comum.

### 5. Admin / ops
Entra quando:
- a superfície é administrativa;
- escrita sensível ou moderação exige controle forte;
- a operação precisa de responsabilidade explícita.

Função:
- autenticação forte obrigatória;
- isolado da experiência pública;
- sem mistura com guest, beta ou colaborador reconhecido.

## Opções De Identidade Leve

### Apelido persistente
Prós:
- zero fricção;
- combina com uso de rua;
- já conversa com trust e submissão.

Contras:
- não autentica de verdade;
- pode ser frágil entre dispositivos;
- depende de reputação derivada.

Uso ideal:
- primeira camada de colaboração;
- melhor opção para depois do primeiro envio.

### Código de colaborador
Prós:
- simples de compartilhar;
- bom para migração entre aparelhos;
- não exige conta completa.

Contras:
- pode parecer login disfarçado se entrar cedo demais;
- precisa de UX muito clara para não parecer burocracia.

Uso ideal:
- colaborador reconhecido;
- suporte multi-device;
- recuperação de continuidade.

### Magic link
Prós:
- forte sem senha;
- liga dispositivos com mais confiabilidade.

Contras:
- adiciona dependência de email;
- pode quebrar a sensação de produto de rua;
- é mais pesado que o fluxo atual.

Uso ideal:
- fallback de identidade reconhecida;
- usuários que já provaram valor e querem sincronizar histórico.

### Convite beta
Prós:
- resolve acesso fechado;
- útil para testes e QA;
- já existe no sistema.

Contras:
- é gate de acesso, não identidade de colaborador;
- não deve virar o principal caminho do produto público.

Uso ideal:
- tester/beta;
- ambiente fechado;
- liberação de superfícies experimentais.

## Recomendação Final
A sequência recomendada é esta:

1. Manter o público completamente aberto no começo.
2. Usar sessão local e apelido persistente como primeira identidade leve.
3. Depois do primeiro envio ou de 2 a 3 retornos úteis, oferecer reforço de identidade com uma superfície leve, não um login clássico.
4. Reservar código de colaborador ou magic link para continuidade entre dispositivos e recuperação de lastro.
5. Deixar convite beta estritamente para tester/beta.
6. Manter admin/ops com autenticação forte e sem atalhos.

## Decisão Objetiva
Se eu tivesse que escolher uma política única agora, seria esta:
- `apelido persistente` como primeira identidade progressiva;
- `código de colaborador` como ponte para continuidade entre dispositivos;
- `magic link` apenas como fallback de sincronização;
- `convite beta` separado, para tester;
- `auth forte` somente para admin/ops e escrita sensível.

Isso preserva a fricção baixa do app e ancora a identidade na utilidade real, não no cadastro.

## Matriz Resumida
| Fase | Entrada | Identidade | Acesso sensível |
|---|---|---|---|
| Visitante aberto | livre | sessão local | não |
| Colaborador guest | pós-uso | apelido persistente | não |
| Colaborador reconhecido | retorno/valor | trust + código opcional | apenas conforme regra operacional |
| Tester / beta | convite | cookie beta + coorte | superfícies beta |
| Admin / ops | explícito | auth forte | sim |

## Próximo Passo Recomendado
Implementar isso em camadas:
- primeiro, uma API única de identidade progressiva no cliente;
- depois, gatilhos de prompt no pós-primeiro-envio e no retorno 2/3;
- por fim, sincronização opcional por código ou magic link.
