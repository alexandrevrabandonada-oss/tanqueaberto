# Estado da Nação: deployment real Vercel fix

## Resumo executivo

Veredito final: **GO**

O bloqueio mais crítico foi restaurado: o deployment público real do Bomba Aberta voltou a existir, foi promovido no Vercel e responde no domínio canônico público.

## Causa raiz objetiva

A queda pública vinha de uma combinação de dois problemas:

1. O projeto Vercel local estava apontando para um vínculo antigo que já não existia mais no time remoto.
2. O deployment novo falhava no build do Vercel por causa de uma fronteira client/server desnecessariamente global em `SubmissionHistoryProvider`, o que quebrava o prerender do `/_not-found` no ambiente de build do Vercel.

## O que foi corrigido

### Configuração Vercel

- O workspace foi relinkado para `alexandrevrabandonada-oss-projects/bomba-aberta`.
- As variáveis críticas do Supabase foram adicionadas ao projeto Vercel novo.
- Foi criado um production deployment novo.
- O alias canônico `https://bomba-aberta.vercel.app` foi promovido para esse deployment.

### Código

- `SubmissionHistoryProvider` saiu do `RootLayout` em [app/layout.tsx](C:/Projetos/Tanque%20Aberto/app/layout.tsx).
- O provider foi mantido apenas nas rotas que realmente o usam:
  - [app/page.tsx](C:/Projetos/Tanque%20Aberto/app/page.tsx)
  - [app/hub/page.tsx](C:/Projetos/Tanque%20Aberto/app/hub/page.tsx)
  - [app/enviar/page.tsx](C:/Projetos/Tanque%20Aberto/app/enviar/page.tsx)

Isso removeu a borda global que estava contaminando o prerender do `/_not-found` no build remoto.

## Alvo real validado

- Domínio canônico público: `https://bomba-aberta.vercel.app`
- Deployment de produção: `https://bomba-aberta-hb637z16p-alexandrevrabandonada-oss-projects.vercel.app`

## Checklist curto

| Checagem | Status | Evidência |
| --- | --- | --- |
| `/` | OK | 200 |
| `/api/health` | OK | 200 |
| manifest | OK | acessível |
| service worker | OK | acessível |
| icons | OK | acessíveis |
| `/atualizacoes` | OK | responde |
| `/enviar` | OK | responde |
| `/hub` | OK | responde |
| schema/runtime repetitivo no servidor | OK | gate limpo |

## Validação

Executado com sucesso:
- `npm run typecheck`
- `npm run build`
- `npm run verify`
- `npm run go-live:check` com `GO_LIVE_URL=https://bomba-aberta.vercel.app`

## Leitura operacional

Antes da correção, o domínio canônico e o preview promovido respondiam `DEPLOYMENT_NOT_FOUND` / `404`.
Depois da correção, o alias público responde e o gate retorna `GO`.

## Próxima ação

Nenhuma pendência crítica. O alvo real agora está validável e pronto para abertura pública.
