# Estado da Nação: go-live real final

## Resumo executivo

Veredito final: **HOLD**

Eu rodei o launch gate contra o alvo real de lançamento usando a URL de preview/promocao registrada no projeto:
- `https://bomba-aberta-qoy9rpouu-alexandrevrabandonada-oss-projects.vercel.app`

Em seguida validei também o fallback publico canônico do app:
- `https://bomba-aberta.vercel.app`

Os dois alvos responderam com `DEPLOYMENT_NOT_FOUND` / `404`, então o problema nao e mais de rota interna, mas de disponibilidade do proprio deployment esperado para a abertura publica.

## Checklist curto

### Abrir
- [x] Env criticas presentes no workspace
- [x] Bucket de foto acessivel
- [x] Base de dados com postos ativos suficientes
- [x] Verificacao de build/typecheck/verify no repo local

### Nao abrir
- [ ] O preview/promocao real responde no dominio esperado
- [ ] O dominio publico canonico responde com a aplicacao
- [ ] `/` responde com HTML da home
- [ ] `/api/health` responde no alvo real
- [ ] Manifest, service worker e icones estao acessiveis no alvo real
- [ ] Smoke de `/`, `/atualizacoes`, `/enviar`, `/hub` passa no alvo real

## Blockers reais

| Severidade | Blocker | Evidencia | Ação recomendada |
| --- | --- | --- | --- |
| Critical | Deployment real nao existe/nao esta acessivel no URL promovido | `DEPLOYMENT_NOT_FOUND` no preview de promocão | Reativar/promover o deployment correto ou corrigir o URL de entrada |
| Critical | Dominio publico canônico nao serve a aplicação | `404` em `https://bomba-aberta.vercel.app` | Corrigir apontamento do dominio ou republicar o deployment |
| Critical | Healthcheck nao responde no alvo real | `/api/health` retorna `404` no alvo testado | Garantir deployment ativo antes de abrir ao público |

## Resultado do gate real

- Base testada: `https://bomba-aberta-qoy9rpouu-alexandrevrabandonada-oss-projects.vercel.app`
- Veredito do gate: `NO-GO`
- Motivo: o deployment alvo nao existe mais no Vercel no endereco testado

## Leitura operacional

O repo local esta consistente, mas isso nao basta para lancamento publico.
O critério de abertura real exige que o alvo em producao ou preview promovido esteja vivo no endpoint que sera divulgado.
Sem isso, qualquer smoke adicional vira falso positivo local.

## Próxima ação objetiva

1. Confirmar qual deployment e o candidato final a abertura publica.
2. Reapontar `NEXT_PUBLIC_SITE_URL` / `GO_LIVE_URL` para esse alvo.
3. Rerodar `npm run go-live:check` contra esse endereço vivo.
