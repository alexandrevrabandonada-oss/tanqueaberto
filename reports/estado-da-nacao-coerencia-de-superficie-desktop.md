# Estado da Nação — Coerência de Superfície Desktop

Data: 2026-03-26

## Objetivo
Reduzir competição entre shell global, topo de exploração, rail lateral, hero da rota e CTA principal nas rotas públicas desktop.

## Escopo Auditado
- `/`
- `/atualizacoes`
- `/enviar`
- `/hub`

## Classificação Por Rota
### `/`
- Primária: hero de exploração com mapa vivo e recorte principal.
- Secundária: ações contextuais do recorte e lista de postos.
- Contextual: shell global, status strip e reforços de contexto.

### `/atualizacoes`
- Primária: feed principal de atualizações.
- Secundária: filtros e busca do feed.
- Contextual: rail com leitura rápida de volume, última leitura e melhor gesto.

### `/enviar`
- Primária: formulário de envio.
- Secundária: orientação do fluxo e posto pré-selecionado.
- Contextual: rail de explicação da fila e da moderação.

### `/hub`
- Primária: hero de continuidade do hub, com próximo passo e impacto.
- Secundária: agenda operacional, missão, recents e cards de continuidade.
- Contextual: geofencing, prova de vida e status de sessão.

## O Que Mudei
- O CTA shell de desktop foi suprimido nas rotas que já têm superfície principal suficiente: [components/layout/global-submit-cta.tsx](C:/Projetos/Tanque%20Aberto/components/layout/global-submit-cta.tsx)
- O rail de `/enviar` perdeu o bloco de atalhos que repetia ações já presentes no hero: [app/enviar/page.tsx](C:/Projetos/Tanque%20Aberto/app/enviar/page.tsx)
- O rail de `/atualizacoes` perdeu a camada de ações rápidas e ficou só com contexto de leitura: [app/atualizacoes/page.tsx](C:/Projetos/Tanque%20Aberto/app/atualizacoes/page.tsx)
- O rail de `/hub` perdeu o card lateral que espelhava métricas já mostradas no hero: [components/hub/collector-hub.tsx](C:/Projetos/Tanque%20Aberto/components/hub/collector-hub.tsx)

## Antes / Depois Por Rota
### `/`
- Antes: shell global de desktop competia com a exploração principal.
- Depois: o shell desktop some nessa rota, deixando o mapa e o recorte como leitura principal; o CTA persiste no mobile via dock.

### `/atualizacoes`
- Antes: feed principal + rail com resumo + bloco de ações rápidas, incluindo CTA de envio.
- Depois: feed principal continua como foco; o rail fica informativo e não disputa com o feed nem com o shell.

### `/enviar`
- Antes: formulário + rail com fluxo, posto escolhido e um bloco de atalhos repetindo voltar ao mapa e ver atualizações.
- Depois: o rail fica só com fluxo, fila, moderação e posto escolhido; a rota continua acionável sem ecoar CTA equivalente.

### `/hub`
- Antes: hero de continuidade + rail com sessão, fila e missão, repetindo as mesmas métricas do topo.
- Depois: o hero fica sozinho como superfície primária; o rail mantém apenas continuação real, sem resumo redundante.

## Diff Enxuto
- Arquivos tocados neste round: 4
- Alterações líquidas: 18 inserções, 64 deleções
- Arquivos tocados:
- [components/layout/global-submit-cta.tsx](C:/Projetos/Tanque%20Aberto/components/layout/global-submit-cta.tsx)
- [app/enviar/page.tsx](C:/Projetos/Tanque%20Aberto/app/enviar/page.tsx)
- [app/atualizacoes/page.tsx](C:/Projetos/Tanque%20Aberto/app/atualizacoes/page.tsx)
- [components/hub/collector-hub.tsx](C:/Projetos/Tanque%20Aberto/components/hub/collector-hub.tsx)

## Validação
- `npm run typecheck` passou.
- `npm run build` passou.
- `npm run lint` passou com warnings antigos já conhecidos em `components/home/home-browser.tsx`, `components/forms/price-submit-form.tsx`, `components/layout/retention-hub.tsx` e `hooks/use-inbox.ts`.

## Leitura Final
A home, updates, enviar e hub agora têm uma única superfície primária acima da dobra em desktop. O shell global deixou de competir quando a rota já é forte por si, e os rails ficaram úteis em vez de espelhar o hero.
