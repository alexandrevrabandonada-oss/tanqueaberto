# Estado da Nacao: auditoria real de performance mobile

## Diagnostico tecnico
O problema de peso mobile nao estava mais no fluxo central de UX. O custo vinha de tres blocos concretos:

1. `app/page` ainda carregava um client shell grande para home, filtro, memoria e orquestracao de superficie.
2. `app/enviar` seguia pesado por concentrar o formulario guiado inteiro, mesmo com queue e feedback ja atrasados.
3. `app/hub` ainda carregava continuidade, memoria e orquestracao visual demais cedo.

A auditoria mostrou que o maior ganho real vinha de empurrar chrome global e superfices secundarias para chunks atrasados, especialmente:
- PWA register
- status strip de PWA/rede
- sincronizacao de modo de performance
- overlay de missao
- indicador de teste
- CTA global do shell
- mapa da home
- barra de memoria operacional

## Maiores viloes
1. Home client shell: `components/home/home-browser.tsx`
   - ainda e o maior bloco por rota, porque concentra busca, filtros, estados de contexto, orquestracao de top bar e grande parte da logica de lista.
   - a pagina principal continua com o maior chunk de cliente, em `app/page`.

2. Envio guiado: `components/forms/price-submit-form.tsx`
   - o fluxo esta correto, mas o formulario ainda concentra muitas bordas operacionais.
   - a rota `app/enviar` continua sendo uma das mais pesadas.

3. Hub de continuidade: `components/hub/collector-hub.tsx`
   - a superficie foi simplificada visualmente, mas ainda monta bastante contexto.

4. Chrome global: `app/layout.tsx` e `components/layout/app-shell.tsx`
   - PWA, missao, teste, barra de status e CTA contextual estavam entrando cedo demais.
   - agora estao em chunks mais tardios.

5. Mapa: `components/home/home-map-surface.tsx`, `components/map/station-map-shell.tsx`, `components/map/station-map.tsx`
   - o mapa continua existindo, mas nao deve pesar antes de ser necessario.
   - a home list-first e o mapa leve agora entram mais tarde.

## Patch completo
Arquivos tocados nesta passada:
- `app/layout.tsx`
- `components/layout/app-shell.tsx`
- `components/home/home-browser.tsx`
- `components/home/home-map-surface.tsx`
- `components/map/station-map-shell.tsx`
- `components/map/station-map.tsx`
- `components/layout/performance-mode-sync.tsx`
- `components/pwa-register.tsx`
- `components/mission/mission-overlay.tsx`
- `components/test/test-mode-indicator.tsx`

O que mudou:
- `PwaRegister`, `MissionOverlay` e `TestModeIndicator` deixaram de montar como chrome imediato do root layout e passaram a ser carregados de forma mais tardia.
- `GlobalSubmitCta`, `PerformanceModeSync` e `PwaStatusStrip` deixaram de entrar junto com o shell principal.
- `HomeMapSurface` e `OperationalMemoryBar` foram atrasados na home.
- O mapa continua sendo montado com guardas de performance e modo leve, sem disputar o primeiro frame.

## Antes / Depois
### Rotas publicas: tamanho de cliente
- `/`: `29.5 kB` -> `28.4 kB`
- `/atualizacoes`: `6.47 kB` -> `4.62 kB`
- `/enviar`: `19.2 kB` -> `19.9 kB`
- `/hub`: `15.4 kB` -> `13.5 kB`
- `/postos/sem-atualizacao`: `3.02 kB` -> `1.19 kB`
- `/beta`: `2.95 kB` -> `1.03 kB`
- `/feedback`: `3.42 kB` -> `1.5 kB`
- `/postos/[id]`: `4.71 kB` -> `2.75 kB`

### Chunks maiores apos a auditoria
- `framework`: `189,766 bytes`
- shared chunks principais: `173,020 bytes` e `172,501 bytes`
- `app/page`: `102,463 bytes`
- `app/enviar/page`: `75,069 bytes`
- `app/hub/page`: `49,703 bytes`

Leitura pratica:
- O corte deu resultado real nas rotas de apoio e nas paginas internas menores.
- A home continua sendo o maior peso de cliente, porque concentra o shell operacional mais rico.
- O envio continua grande por ser o fluxo critico da rua, mas a fila e o feedback ficaram mais tardios.

## Resumo operacional
- O mapa nao entra cedo demais.
- O chrome global ficou menos intrusivo.
- As rotas secundarias ficaram mais leves.
- O primeiro custo percebido no mobile melhorou, mas o maior residual ainda esta na home client shell.

## Validacao
- `npm run build` passou.
- `npm run typecheck` passou.
- `npm run verify` passou.

## Residual
- O maior gargalo restante e o client shell da home, especialmente `TopOrchestrator` e a logica de estado da lista/filtros.
- O envio ainda e um fluxo grande por natureza, mas nao reverteu a simplificacao funcional.
- Os warnings antigos de cache do webpack continuam no ambiente local; nao bloquearam a validacao.
