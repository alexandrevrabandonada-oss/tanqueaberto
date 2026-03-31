# Estado da Nação - Hub Sessao Local Sem Login v1

## Resumo
Esta passada fez o Meu Hub funcionar com continuidade local real sem exigir login tradicional.

O que mudou de forma funcional:
- `deviceId` persistente no navegador.
- `sessionId` persistente enquanto a sessao esta ativa.
- historico local basico de sessoes encerradas.
- ultimo gesto e proximo passo derivados da sessao local.
- zero-state, returning-state e active-state separados no Hub.
- refresh preserva continuidade porque o estado vive em `localStorage`.
- limpar os dados do site reinicia tudo naturalmente porque a identidade local tambem mora em storage local.

## Arquivos Tocados
- `lib/session/local-session.ts`
- `hooks/use-street-session.ts`
- `components/hub/collector-hub.tsx`

## Arquitetura Da Sessao Local
A sessao local agora e composta por tres camadas:

1. Identidade do navegador
- `bomba-aberta:device-id`
- gerado uma vez por navegador e reaproveitado em novas visitas.

2. Sessao corrente
- `bomba-aberta:street-session`
- guarda `sessionId`, `startTime`, `lastActivity`, contadores e `lastGesture`.
- expira por inatividade apos 30 minutos.
- ao expirar, e convertida em resumo e movida para o historico.

3. Historico e resumo
- `bomba-aberta:street-session-history`
- `bomba-aberta:last-session-summary`
- mantem a memoria basica do ultimo ciclo para retorno sem onboarding sobrando.

Persistencias ja existentes e mantidas separadas:
- rascunhos continuam em IndexedDB via `lib/drafts/submission-draft.ts`.
- fila continua em `localStorage` + IndexedDB de fotos via `lib/queue/submission-queue.ts`.

## Estados Do Hub
- `zero-state`: sem sessao corrente e sem historico local relevante; mostra a superficie primaria de entrada.
- `returning-state`: nao ha sessao corrente, mas o aparelho ja tem memoria local; a continuidade vem primeiro.
- `active-state`: ha sessao corrente viva; o Hub privilegia o ultimo gesto e o proximo passo.

## Mudanca No Hub
Em `components/hub/collector-hub.tsx`:
- o topo passou a ler `useStreetSession()` para distinguir `sessionMode`.
- o card principal usa o `lastGesture` local antes de cair em envio salvo, fila ou missao.
- o CTA principal agora deriva do `nextStep` local quando ha continuidade no aparelho.
- o zero-state ficou estrito: nao aparece quando existe memoria local anterior.
- o rail do Hub continua fora do mobile narrow.

## Antes E Depois
### Mobile narrow
Antes:
- o Hub podia parecer voltar para onboarding mesmo depois de uso anterior.
- o estado de retorno e o de atividade se misturavam visualmente.

Depois:
- zero-state mostra uma unica superficie primaria.
- retorno/atividade mostram continuidade primeiro.
- o CTA principal segue o ultimo gesto ou o proximo passo real.

### Desktop
Antes:
- a superficie do Hub nao distinguia bem continuidade real de retorno limpo.

Depois:
- a leitura primaria usa estado local real.
- a hierarquia do proximo gesto fica mais clara.
- o rail continua util sem invadir a leitura principal.

## Validacao
Rodado com sucesso:
- `npm run typecheck`
- `npm run build`
- `npm run verify`

Warnings existentes no build:
- `components/forms/price-submit-form.tsx`
- `components/home/home-browser.tsx`
- `components/layout/retention-hub.tsx`

Esses avisos ja existiam e nao vieram desta passada.

## Observacao Final
Nao houve mexida em `admin`, `beta` ou em auth tradicional. A continuidade foi resolvida exclusivamente com identidade e memoria locais do navegador.

