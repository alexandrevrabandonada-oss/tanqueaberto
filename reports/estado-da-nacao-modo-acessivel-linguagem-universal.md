# Estado da Nacao: modo acessivel e linguagem universal

Data: 2026-03-30

## Objetivo

Reduzir jargao, encurtar microcopy e deixar home, mapa, envio, atualizacoes e hub mais legiveis em poucos segundos.

## Inventario de textos que estavam mais confusos

### Mapa e posto
- "Cadastro"
- "Sem preco recente"
- "Localizacao em revisao"
- "Pin Selecionado"
- "Posto cadastrado, sem preco recente."

### Feed e atualizacoes
- "Linha do tempo"
- "Entradas mais recentes"
- "O feed mostra o que ja foi aprovado. Se quiser ajudar o mapa, veja os postos sem preco ou envie um preco."

### Hub
- "Sessao recente"
- "Reputacao e territorio"
- "Memoria local preservada"
- "Abrir o eixo principal"
- "Continuacao local"
- "Continuacao real"

### Utilidade
- "Utilidade"
- "Lacunas Fechadas"
- "Prximo Nvel"
- "Status de Aucao"

### Envio
- blocos com mais de uma acao visivel cedo demais
- referencias longas ao fluxo de revisao antes da camera
- labels de apoio que competiam com a primeira tarefa

## O que foi ajustado

### Mapa e posto
- "Cadastro" virou "Sem bandeira"
- "Sem preco recente" virou "Sem preco"
- "Localizacao em revisao" virou "Localizacao em ajuste"
- "Pin Selecionado" virou "Posto escolhido"
- "Posto cadastrado, sem preco recente." virou "Posto sem preco recente."

### Feed e atualizacoes
- "Linha do tempo" virou "Lista recente"
- "Entradas mais recentes" virou "Ultimos precos"
- texto de apoio ficou mais direto: o feed mostra o que ja foi aprovado e aponta para o mapa quando a lista nao ajuda

### Hub
- a entrada do hub ficou com frases mais curtas e mais simples
- "Sessao recente" virou "Sessao recente" com acentos corrigidos e leitura mais direta
- "Reputacao e territorio" virou "Seu impacto"
- "Abrir o eixo principal" virou "Comecar por aqui"
- "Memoria local preservada" virou "Memoria local guardada"
- botoes de retorno ficaram mais diretos, como "Ver pendencias" e "Ver mapa"

### Utilidade
- "Utilidade" foi trocado por linguagem mais cotidiana
- "Lacunas Fechadas" virou "Precos aprovados"
- o card passou a falar mais de ritmo, impacto e proximo passo em vez de niveis internos

### Envio
- o fluxo ficou mais curto e direto
- a camera segue como primeira acao dominante
- os textos de apoio agora explicam o que fazer agora, sem texto longo
- a confirmacao final reforca que o envio entra em revisao

## Arquivos tocados
- [app/enviar/page.tsx](C:/Projetos/Tanque%20Aberto/app/enviar/page.tsx)
- [app/hub/page.tsx](C:/Projetos/Tanque%20Aberto/app/hub/page.tsx)
- [app/atualizacoes/page.tsx](C:/Projetos/Tanque%20Aberto/app/atualizacoes/page.tsx)
- [components/map/station-map.tsx](C:/Projetos/Tanque%20Aberto/components/map/station-map.tsx)
- [components/station/station-card.tsx](C:/Projetos/Tanque%20Aberto/components/station/station-card.tsx)
- [components/feed/feed-browser.tsx](C:/Projetos/Tanque%20Aberto/components/feed/feed-browser.tsx)
- [components/user/utility-status-card.tsx](C:/Projetos/Tanque%20Aberto/components/user/utility-status-card.tsx)
- [components/hub/collector-hub.tsx](C:/Projetos/Tanque%20Aberto/components/hub/collector-hub.tsx)
- [components/onboarding/first-visit-guide.tsx](C:/Projetos/Tanque%20Aberto/components/onboarding/first-visit-guide.tsx)
- [components/forms/submission-queue-panel.tsx](C:/Projetos/Tanque%20Aberto/components/forms/submission-queue-panel.tsx)

## Validacao

- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou