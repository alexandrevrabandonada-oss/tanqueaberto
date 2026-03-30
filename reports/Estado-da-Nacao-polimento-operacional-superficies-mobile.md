# Estado da Nacao: polimento operacional das superficies mobile

## Diagnostico curto

- `mapa-lite`: ainda abria com bloco explicativo alto demais e pouco conteúdo útil logo abaixo.
- `mapa completo`: a home ainda deixava um hero conceitual e filtros altos demais antes do recorte útil.
- `enviar`: a fila local entrava cedo demais no caminho visual do novo envio.
- `hub`: a continuidade estava correta, mas a superfície ainda cheirava a painel técnico em mobile.

## Patch aplicado

- `components/home/home-map-surface.tsx`
  - compactação do cabeçalho e do bloco explicativo
  - lista útil aparece mais cedo no modo lista-first
  - redução de altura e de ruído visual
- `components/map/station-map-shell.tsx`
  - placeholder de mapa leve mais curto e menos ornamental
- `components/home/home-browser.tsx`
  - hero de mapa completo encurtado
  - filtros e caixa de exibição compactados
  - menos altura desperdiçada acima da dobra
- `components/forms/price-submit-form.tsx`
  - fila local rebaixada para aviso compacto com CTA secundário
  - painel completo da fila desce e deixa o novo envio dominante
- `components/hub/collector-hub.tsx`
  - microcopy menos técnica
  - cards secundários menores
  - continuidade mais natural e menos com cara de painel

## Antes e depois

- antes: mais caixas altas e mais texto paralelo antes da tarefa útil
- depois: leitura mais direta, menos densidade e menos competição entre blocos

- antes: mapa-lite explicava demais
- depois: mapa-lite se comporta como ferramenta

- antes: fila local brigava com "tirar foto agora"
- depois: fila virou superfície secundária discreta

- antes: Hub falava como sistema
- depois: Hub fala mais como continuidade de uso real

## Validacao

- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou

## Risco residual

- permanece o warning conhecido de hook em `components/layout/retention-hub.tsx`
- permanecem warnings antigos de cache do webpack sem impacto funcional no build
