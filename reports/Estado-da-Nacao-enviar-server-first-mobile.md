# Estado da Nacao: enviar server-first no mobile

## Diagnostico curto
A rota `/enviar` estava pesada por concentrar o formulario guiado inteiro no caminho inicial do cliente. Mesmo com o fluxo ja simplificado, o primeiro frame ainda carregava o miolo de selecao, revisão, fila e telemetria como parte do mesmo pacote.

O gargalo real era o acoplamento entre a pagina server e o formulario cliente grande. A rota precisava de uma divisao mais clara entre a casca critica e as bordas operacionais.

## O que foi isolado
- A pagina `app/enviar/page.tsx` passou a ser apenas o shell server da rota.
- O formulario pesado foi movido para uma ilha cliente leve em `components/forms/price-submit-island.tsx`.
- O formulário principal passou a carregar em chunk tardio dentro da ilha, em vez de entrar diretamente no primeiro caminho da rota.
- O texto principal, a etapa da foto e o aviso de revisão permanecem no primeiro frame.
- Fila, identidade, feedback e ponte pos-envio continuam fora do caminho critico da primeira leitura.

## Principais viloes encontrados
1. `components/forms/price-submit-form.tsx` concentrava estado, selecao, revisão e bordas no mesmo arquivo.
2. `app/enviar/page.tsx` trazia o formulario direto para a rota sem uma casca intermediaria.
3. A fila e os auxiliares ja estavam separados, mas ainda nao havia um corte suficiente no boundary da rota.

## Antes e depois
### Rota `/enviar`
- Antes: `19.9 kB` e `159 kB` First Load JS
- Depois: `1.88 kB` e `132 kB` First Load JS

### Chunk especifico da rota
- Antes: cerca de `75.1 kB` no chunk de `/enviar`
- Depois: `4,687 bytes`

### Leitura pratica
- A rota agora abre como shell server primeiro.
- O primeiro frame deixa de carregar o formulario pesado completo.
- A area critica fica tocavel mais cedo, enquanto as bordas entram depois.

## Patch aplicado
- [`app/enviar/page.tsx`](C:/Projetos/Tanque%20Aberto/app/enviar/page.tsx)
- [`components/forms/price-submit-island.tsx`](C:/Projetos/Tanque%20Aberto/components/forms/price-submit-island.tsx)
- [`components/forms/price-submit-form.tsx`](C:/Projetos/Tanque%20Aberto/components/forms/price-submit-form.tsx)

## Validacao
- `npm run build` passou
- `npm run typecheck` passou em execucao isolada apos o build
- `npm run verify` passou

## Risco residual
O miolo de `price-submit-form` ainda e grande, mas agora ele nao define mais o primeiro custo da rota. Se houver uma proxima passada, o melhor alvo sera separar internamente o picker de posto e a revisao final do restante do fluxo.
