# Estado da Nação - Budget Mobile Acima da Dobra

## Resumo Executivo
O mobile agora entra mais rápido na ação útil. A camada fixa perdeu peso, o badge de movimento saiu do celular, os apoios laterais viraram tablet/desktop e as rotas públicas passaram a mostrar menos cerimônia antes da primeira decisão real.

## Budget Por Rota

| Rota | Budget móvel acima da dobra | O que aparece primeiro | O que ficou fora do mobile |
| --- | --- | --- | --- |
| `/` | Shell curto + topo compacto + mapa/recorte | Busca compacta, chips essenciais, mapa e CTA inline contextual só quando há recorte | Badge de movimento mobile, rail útil completo, CTA lateral pesada |
| `/atualizacoes` | Shell curto + feed primeiro | Feed e leitura principal, com apoio curto opcional no `md` | Rail útil completo e resumo lateral pesado no celular |
| `/enviar` | Shell curto + formulário primeiro | Formulário, foto e fluxo de envio | Rail útil completo e introdução lateral no celular |
| `/hub` | Shell curto + continuidade primeiro | Próximo passo e continuidade real no bloco principal | Hero introdutório mobile e rail lateral completo |

## Antes / Depois Por Rota

### `/`
- Antes: shell, badge de movimento, topo, card de apoio, CTA inline e conteúdo competiam pela primeira dobra.
- Depois: o celular vê menos camada fixa, o topo entra compacto e o mapa ganha espaço mais cedo.

### `/atualizacoes`
- Antes: o feed vinha acompanhado de apoio lateral pesado logo no mesmo viewport.
- Depois: o feed assume a dobra e o apoio vira opcional no tablet, sem rail pesado no celular.

### `/enviar`
- Antes: havia introdução, apoio lateral e formulário antes da ação real ficar dominante.
- Depois: o formulário lidera e a lateral só volta em telas maiores.

### `/hub`
- Antes: hero de entrada e rail de continuidade ainda disputavam o começo da rota.
- Depois: a continuidade real sobe primeiro e a introdução lateral some no mobile.

## Componentes Tocados

- [components/layout/app-shell.tsx](C:/Projetos/Tanque Aberto/components/layout/app-shell.tsx)
- [components/layout/top-orchestrator.tsx](C:/Projetos/Tanque Aberto/components/layout/top-orchestrator.tsx)
- [components/home/home-browser.tsx](C:/Projetos/Tanque Aberto/components/home/home-browser.tsx)
- [app/atualizacoes/page.tsx](C:/Projetos/Tanque Aberto/app/atualizacoes/page.tsx)
- [app/enviar/page.tsx](C:/Projetos/Tanque Aberto/app/enviar/page.tsx)
- [app/hub/page.tsx](C:/Projetos/Tanque Aberto/app/hub/page.tsx)
- [components/hub/collector-hub.tsx](C:/Projetos/Tanque Aberto/components/hub/collector-hub.tsx)

## Leitura Visual

- Menos acúmulo de camadas antes da ação útil.
- Menos cards paralelos no mobile.
- Menos disputa entre shell, apoio e conteúdo principal.
- Mais espaço real para mapa, feed, formulário e continuidade.

## Validação

- `npm run typecheck` passou.
- `npm run build` passou.
- `npm run verify` passou.

## Estado Final

O mobile agora se comporta mais como ferramenta de rua: a estrutura fixa ficou mais leve, os apoios secundários saíram da dobra e cada rota mostrou a superfície útil mais cedo.