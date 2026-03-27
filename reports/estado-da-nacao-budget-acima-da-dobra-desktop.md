# Estado da Nação - Budget Acima da Dobra Desktop

## Resumo executivo
A disciplina de layout no desktop foi reduzida para menos cerimônia e mais produto. O shell perdeu altura, o topo ficou mais curto, e as rotas públicas passaram a expor o conteúdo útil mais cedo.

## Budget por rota
| Rota | Budget acima da dobra | O que ficou mais cedo |
| --- | --- | --- |
| `/` | shell compacto + topo compacto + hero editorial oculto no desktop | mapa, recorte e filtros operacionais |
| `/atualizacoes` | shell compacto + feed principal + rail reduzido | busca, filtros e timeline do feed |
| `/enviar` | shell compacto + intro curta + formulário mais cedo | formulário de envio e moderação |
| `/hub` | shell compacto + intro de página ocultada no desktop + hub condensado | próximo gesto, sessão recente e fila |

## O que foi reduzido
- Header global com menos altura e menos margem vertical.
- Blocos de entrada da home com menos peso visual no desktop.
- Hero editorial da home tratado como ruído no desktop largo.
- Rail de `/atualizacoes` e `/enviar` encurtado e com top menor.
- Introdução de `/hub` escondida no desktop, deixando o hub real assumir o topo.
- Cards de feed e envio com densidade um pouco menor no desktop.

## Componentes tocados
- [components/layout/app-shell.tsx](C:/Projetos/Tanque%20Aberto/components/layout/app-shell.tsx)
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)
- [components/feed/feed-browser.tsx](C:/Projetos/Tanque%20Aberto/components/feed/feed-browser.tsx)
- [app/atualizacoes/page.tsx](C:/Projetos/Tanque%20Aberto/app/atualizacoes/page.tsx)
- [app/enviar/page.tsx](C:/Projetos/Tanque%20Aberto/app/enviar/page.tsx)
- [app/hub/page.tsx](C:/Projetos/Tanque%20Aberto/app/hub/page.tsx)
- [components/hub/collector-hub.tsx](C:/Projetos/Tanque%20Aberto/components/hub/collector-hub.tsx)

## Dif focado
- `7` arquivos tocados neste pacote
- Redução do peso visual acima da dobra em todas as rotas públicas
- Sem mudança em admin, beta ou tooling de gate/release

## Antes e depois por rota
### `/`
Antes: hero editorial, quick access e filtros disputavam altura com o mapa e o recorte.
Depois: o desktop largo dá espaço mais cedo para a navegação útil, enquanto o bloco editorial fica rebaixado.

### `/atualizacoes`
Antes: o rail competia com o feed por atenção e altura.
Depois: o feed assume o foco mais cedo e o rail fica curto, informativo e não redundante.

### `/enviar`
Antes: a rota carregava introdução e rail com mais peso do que o formulário precisava.
Depois: o formulário aparece com menos ruído, e o rail só sustenta a ordem do fluxo e a moderação.

### `/hub`
Antes: a página abria com uma apresentação extra antes do hub real.
Depois: a introdução de desktop some e a continuidade operacional entra mais cedo.

## Validação
- `npm run typecheck`: passou na rerun sequencial
- `npm run build`: passou
- `npm run verify`: passou

## Recomendação
Deploy deste pacote agora.

