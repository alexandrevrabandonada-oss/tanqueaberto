# Estado da Nação - Layout Largo Intencional

## Resumo
A shell do Bomba Aberta deixou de depender de uma coluna central apertada e passou a usar a largura extra com intenção nas quatro superfícies principais: mapa/home, atualizações, enviar e Meu Hub.

O foco deste ciclo foi manter o DNA mobile-first, mas dar a desktop e tablet uma composição nativa, com rail contextual, hierarquia mais ampla e menos sensação de "mobile esticado".

## O Que Mudou

### Shell global
- [components/layout/app-shell.tsx](C:/Projetos/Tanque%20Aberto/components/layout/app-shell.tsx) agora libera mais largura em tablet e desktop.
- A experiência mobile continua preservada, com o mesmo eixo central e a navegação inferior.

### Home / Mapa
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx) ganhou um bloco largo para o mapa com rail lateral contextual em telas grandes.
- O mapa ficou mais alto em desktop para evitar sensação de card pequeno espremido.
- O rail lateral destaca ação, recorte atual, atalhos e leitura rápida do território.

### Atualizações
- [app/atualizacoes/page.tsx](C:/Projetos/Tanque%20Aberto/app/atualizacoes/page.tsx) passou a usar composição de duas zonas:
  - coluna principal para o feed
  - rail contextual com ação rápida e leitura do estado do produto

### Enviar
- [app/enviar/page.tsx](C:/Projetos/Tanque%20Aberto/app/enviar/page.tsx) também ganhou estrutura de duas zonas:
  - formulário principal no eixo nativo
  - rail de apoio com checklist e atalhos para mapa e feed
- O fluxo de envio continua o mesmo, mas agora parece desenhado para tela larga.

### Meu Hub
- [components/hub/collector-hub.tsx](C:/Projetos/Tanque%20Aberto/components/hub/collector-hub.tsx) foi ampliado para `xl` com sidebar mais clara e espaçamento maior.
- O hub agora segura melhor a leitura lateral sem perder a coluna principal de operações.

## Arquivos De Captura
- [scripts/capture-layout-largo-intencional.cjs](C:/Projetos/Tanque%20Aberto/scripts/capture-layout-largo-intencional.cjs)
- [reports/layout-largo-intencional/metrics.json](C:/Projetos/Tanque%20Aberto/reports/layout-largo-intencional/metrics.json)

## Screenshots

### Mobile
- [Home](C:/Projetos/Tanque%20Aberto/reports/layout-largo-intencional/home-mobile.png)
- [Atualizações](C:/Projetos/Tanque%20Aberto/reports/layout-largo-intencional/atualizacoes-mobile.png)
- [Enviar](C:/Projetos/Tanque%20Aberto/reports/layout-largo-intencional/enviar-mobile.png)
- [Meu Hub](C:/Projetos/Tanque%20Aberto/reports/layout-largo-intencional/hub-mobile.png)

### Tablet
- [Home](C:/Projetos/Tanque%20Aberto/reports/layout-largo-intencional/home-tablet.png)
- [Atualizações](C:/Projetos/Tanque%20Aberto/reports/layout-largo-intencional/atualizacoes-tablet.png)
- [Enviar](C:/Projetos/Tanque%20Aberto/reports/layout-largo-intencional/enviar-tablet.png)
- [Meu Hub](C:/Projetos/Tanque%20Aberto/reports/layout-largo-intencional/hub-tablet.png)

### Desktop
- [Home](C:/Projetos/Tanque%20Aberto/reports/layout-largo-intencional/home-desktop.png)
- [Atualizações](C:/Projetos/Tanque%20Aberto/reports/layout-largo-intencional/atualizacoes-desktop.png)
- [Enviar](C:/Projetos/Tanque%20Aberto/reports/layout-largo-intencional/enviar-desktop.png)
- [Meu Hub](C:/Projetos/Tanque%20Aberto/reports/layout-largo-intencional/hub-desktop.png)

## Validação
- `npm run typecheck` passou.
- `npm run build` passou.
- O build ainda emite warnings antigos de hooks, mas eles não bloqueiam a entrega desta passada.

## Leitura Final
- O mapa/home agora usa a largura extra com foco visual real, não só aumento de escala.
- Atualizações e Enviar deixaram de parecer telas mobile ampliadas.
- Meu Hub ganhou presença lateral mais consistente e intenção de produto maior.
- A identidade continua VR Abandonada/Bomba Aberta, sem virar dashboard corporativo.

## Pendências
- A captura automatizada gerou as imagens, mas a extração de métricas por seletor não ficou confiável nesta execução; por isso, os screenshots são a fonte visual principal desta entrega.
- Se você quiser, a próxima passada pode polir ainda mais o home para mover algumas superfícies auxiliares para a rail lateral com mais agressividade em `xl`.
