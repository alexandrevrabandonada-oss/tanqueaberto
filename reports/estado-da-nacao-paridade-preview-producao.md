# Estado da Nação - Paridade Preview/Produção

## Resumo Executivo
A divergência entre o que os relatórios descreviam e o que aparecia em captura vinha de duas camadas diferentes:

1. O produto já estava governado corretamente no código atual, com CTA global rebaixado por rota e breakpoint.
2. Parte das capturas ainda parecia carregar shell/asset antigo, o que é consistente com cache de service worker e cache persistente de navegador em um app PWA.

O ajuste desta passada fechou a paridade observável sem mexer em admin ou beta:
- o root público agora carrega marcadores explícitos de build;
- o shell expõe um stamp visível em dev e preview;
- o service worker foi invalidado com um novo cache versionado;
- não encontrei fallback client-only que reative o CTA legado no mobile.

## Causa Raiz Objetiva
- Produção atual da Vercel aponta para `main` no commit `4682a5638c8a91b6cda2e2af19538db5ebe39437`.
- O código auditado já não depende de um `useMediaQuery` ou fallback client-only para governar o CTA global.
- O sintoma mais plausível para o CTA amarelo forte no mobile é um cliente preso em SW/cache antigo, não a regra atual do shell.
- O SW anterior estava em `bomba-aberta-v6`; nesta passada ele foi elevado para `bomba-aberta-v7` para forçar troca de cache.

## O Que Foi Mudado
- Root público em `app/layout.tsx` passou a receber `data-build-env`, `data-build-ref` e `data-build-sha`.
- `components/layout/app-shell.tsx` passou a exibir um stamp de build visível em preview/dev com a forma `env · ref · sha`.
- `public/sw.js` foi versionado para `bomba-aberta-v7`, invalidando o cache anterior.
- Adicionei `lib/runtime/build-info.ts` para centralizar a leitura do runtime de build.

## Arquivos Tocados
- [app/layout.tsx](/C:/Projetos/Tanque%20Aberto/app/layout.tsx)
- [components/layout/app-shell.tsx](/C:/Projetos/Tanque%20Aberto/components/layout/app-shell.tsx)
- [public/sw.js](/C:/Projetos/Tanque%20Aberto/public/sw.js)
- [lib/runtime/build-info.ts](/C:/Projetos/Tanque%20Aberto/lib/runtime/build-info.ts)

## Validação
- `npm run typecheck` passou
- `npm run build` passou
- `npm run verify` passou

## Leitura Prática
- Produção e o código atual estão alinhados em `main`.
- Se uma captura ainda mostrar CTA forte no mobile, a hipótese mais forte agora é cache antigo no cliente ou snapshot preso em build anterior.
- O novo stamp de build em preview/dev serve para provar isso rapidamente nas próximas capturas.

## Próximo Passo Recomendado
- Se ainda aparecer divergência em screenshot após este deploy, a próxima investigação deve mirar o cliente de captura e a persistência de storage/SW, não a regra do CTA no produto.
