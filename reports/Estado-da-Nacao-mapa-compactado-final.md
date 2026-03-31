# Estado da Nação: mapa compactado final

## Diagnóstico curto
A home ainda carregava duas superfícies altas demais acima da dobra: o bloco de mapa-leve explicava mais do que mostrava, e o mapa completo ainda parecia um hero de landing com muita altura antes da lista útil.

## Patch aplicado
- Em [components/home/home-map-surface.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-map-surface.tsx), o modo `lista primeiro` foi reordenado para mostrar a lista útil antes do bloco de ajuda.
- O card explicativo do mapa-lite foi encurtado e perdeu texto redundante.
- A altura do mapa-lite caiu para aparecer mais cedo no mobile.
- No mapa completo, o header ficou mais curto e a altura do mapa foi reduzida para diminuir a cara de landing.
- Em [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx), o hero mobile foi enxugado para leitura mais rápida e menos peso visual acima da dobra.
- Em [components/map/station-map-shell.tsx](C:/Projetos/Tanque%20Aberto/components/map/station-map-shell.tsx), o placeholder de carregamento ficou mais baixo para não alongar o primeiro frame.

## Antes / Depois
### Antes
- O mapa-lite explicava demais antes de mostrar a lista.
- O mapa completo ocupava mais altura do que precisava.
- A leitura inicial ainda parecia uma landing com muito bloco alto.

### Depois
- A lista útil aparece primeiro no mapa-lite.
- A explicação foi reduzida ao mínimo operacional.
- O mapa completo ficou mais compacto e mais ferramenta do que vitrine.
- A home perde menos altura antes de entregar contexto e ação.

## Critério de aceite atingido
- Menos altura gasta antes da lista.
- Menos cara de landing.
- Mais cara de ferramenta de rua.
- Sem tocar no fluxo de envio.

## Validação
- `npm run build` passou.
- `npm run typecheck` passou.
- `npm run verify` passou.

## Observação
Os warnings antigos de cache do webpack continuam no build local, mas não bloquearam a compactação nem a validação.
