# Estado da Nação: cobertura territorial de postos

## Diagnóstico
A base de postos já tinha sinais isolados de cobertura, mas faltava uma leitura operacional única para mostrar onde a rede está boa, fraca ou vazia por cidade e bairro. A nova tela em `/admin/ops/cobertura-territorial` consolida essa leitura sem reabrir fluxo público.

## O Que Entrei
- Criei o helper [lib/ops/territorial-coverage.ts](C:/Projetos/Tanque%20Aberto/lib/ops/territorial-coverage.ts) para agrupar postos por cidade e bairro.
- Adicionei a página operacional [app/admin/ops/cobertura-territorial/page.tsx](C:/Projetos/Tanque%20Aberto/app/admin/ops/cobertura-territorial/page.tsx).
- Incluí atalho no painel de ops em [app/admin/ops/page.tsx](C:/Projetos/Tanque%20Aberto/app/admin/ops/page.tsx).

## O Que a Leitura Mostra
- Quantidade de postos por cidade e bairro.
- Quantidade com preço recente.
- Quantidade sem preço recente.
- Quantidade em revisão.
- Zonas classificadas como `boa`, `fraca` ou `vazia`.
- Sinais cruzados de semeadura, edições leves, duplicidade e base sem atualização.

## Regras Operacionais
- `boa`: leitura recente suficiente para a base principal.
- `fraca`: ainda há posto, mas falta densidade ou leitura recente.
- `vazia`: o bairro ainda depende de semeadura ou de confirmação de duplicidade.

## Validação
- `npm run typecheck` passou.
- `npm run build` passou.
- `npm run verify` passou.

## Resultado de Build
- `/admin/ops/cobertura-territorial`: `172 B` de route size e `106 kB` de First Load JS.
- `shared JS global` permanece em `103 kB`.
- O painel de ops passou a exibir o atalho da cobertura territorial sem impactar o fluxo público.
