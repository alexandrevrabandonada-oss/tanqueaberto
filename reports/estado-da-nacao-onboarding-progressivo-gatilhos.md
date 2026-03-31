# Estado da Nação - Onboarding Progressivo e Gatilhos

Data: 2026-03-27

## Resumo Executivo

O onboarding progressivo foi aplicado sem login tradicional e sem bloquear mapa, atualizações ou o primeiro envio.
A identidade leve agora entra por valor operacional, não na entrada.

## Arquitetura Aplicada

- `useProgressiveIdentity()` passou a ser a fonte única no cliente para fase, sinais locais, trust remoto e gatilhos elegíveis.
- O apelido local é persistido em `localStorage` e sincronizado quando há lastro de submissão ou edição manual.
- O Hub, a home de retorno e o `/enviar` passaram a renderizar convite leve apenas quando há memória, fila, retorno útil ou trust com valor.
- O convite usa uma superfície inline, sem modal agressivo e sem pedir email ou senha.
- Dismissal tem cooldown local de 24h para evitar repetição excessiva.

## Mapa De Gatilhos

| Superfície | Sinal | Quando aparece | Resultado |
| --- | --- | --- | --- |
| `/enviar` | `success` | Depois do primeiro envio concluído | Mostra convite leve para salvar apelido neste aparelho |
| `/enviar` | `draft` | Quando há rascunho persistente restaurado | Sugere salvar apelido para recuperar histórico local |
| `/enviar` | `queue` | Quando existe fila local | Sugere apelido para continuar e reenviar sem perder contexto |
| `/hub` | `returning-state` / `active-state` | Quando o Hub detecta continuidade local | Mostra convite leve antes de qualquer onboarding adicional |
| `/hub` | `queue` | Quando há fila local | Mostra identidade leve como continuação operacional |
| `/hub` | `trust` | Quando há trust remoto com score útil | Sugere apelido para reaproveitar impacto neste aparelho |
| `/` | retorno útil | No segundo ou terceiro retorno útil | Mostra convite leve apenas depois de haver valor claro |

## Regra De Elegibilidade

- visitante aberto continua sem bloqueio
- o primeiro envio segue sem fricção extra
- o retorno inicial não vira pop-up genérico
- o convite só aparece quando há memória local, fila, trust ou retorno maduro
- sessão local e histórico são preservados no aparelho, não em login tradicional

## Telemetria Adicionada

- `identity_prompt_shown`
- `identity_prompt_saved`
- `identity_prompt_dismissed`

Payloads principais:

- contexto da superfície: `home`, `hub`, `submit`
- origem do gatilho: `return`, `success`, `queue`, `trust`, `draft`
- fase atual da identidade
- modo da sessão local
- presença de fila, histórico e trust

## Diff Focado

- [components/identity/progressive-identity-prompt.tsx](../components/identity/progressive-identity-prompt.tsx)
- [components/forms/price-submit-form.tsx](../components/forms/price-submit-form.tsx)
- [components/home/home-browser.tsx](../components/home/home-browser.tsx)
- [components/hub/collector-hub.tsx](../components/hub/collector-hub.tsx)
- [hooks/use-progressive-identity.ts](../hooks/use-progressive-identity.ts)
- [lib/telemetry/types.ts](../lib/telemetry/types.ts)

## Validação

- `npm run typecheck` passou
- `npm run build` passou
- `npm run verify` passou

## Nota Final

A política final ficou alinhada com fluxo de rua:

- público aberto permanece aberto
- identidade leve entra só quando ajuda a continuidade
- primeiro envio não ganha barreira nova
- Hub e retorno reaproveitam contexto sem exigir cadastro tradicional
