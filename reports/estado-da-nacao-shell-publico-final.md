# Estado da Nação: shell público final

## O que mudou

Fechei a disputa entre CTA e conteúdo no mobile sem criar um fluxo novo.

Ajustes principais:
- reduzi a altura morta do frame do app no mobile
- compacteI o header e os espaçamentos verticais do shell
- mantive o CTA contextual no shell para tablet/desktop
- transformei o `Enviar` da navegação inferior em CTA integrado e mais forte no mobile
- preservei mapa, sticky, overlays, tabbar e safe area

## Racional de hierarquia

### Mobile
- o valor real entra antes na primeira dobra
- o CTA principal vive na navegação inferior, não flutuando sobre conteúdo
- não há botão amarelo cobrindo cards, mapa, lista ou texto

### Tablet / desktop
- a navegação continua legível e o rail lateral segue útil
- a ação de envio segue forte, mas sem parecer FAB solto
- a leitura do produto continua mais importante que o gesto

## Arquivos tocados

- [components/layout/app-shell.tsx](C:/Projetos/Tanque%20Aberto/components/layout/app-shell.tsx)
- [components/layout/bottom-nav.tsx](C:/Projetos/Tanque%20Aberto/components/layout/bottom-nav.tsx)

## Screenshots comparativas

### Mobile
- [Home](C:/Projetos/Tanque%20Aberto/reports/shell-public-final/screenshots/mobile/home.png)
- [Atualizações](C:/Projetos/Tanque%20Aberto/reports/shell-public-final/screenshots/mobile/atualizacoes.png)
- [Enviar](C:/Projetos/Tanque%20Aberto/reports/shell-public-final/screenshots/mobile/enviar.png)
- [Hub](C:/Projetos/Tanque%20Aberto/reports/shell-public-final/screenshots/mobile/hub.png)

### Tablet
- [Home](C:/Projetos/Tanque%20Aberto/reports/shell-public-final/screenshots/tablet/home.png)
- [Atualizações](C:/Projetos/Tanque%20Aberto/reports/shell-public-final/screenshots/tablet/atualizacoes.png)
- [Enviar](C:/Projetos/Tanque%20Aberto/reports/shell-public-final/screenshots/tablet/enviar.png)
- [Hub](C:/Projetos/Tanque%20Aberto/reports/shell-public-final/screenshots/tablet/hub.png)

### Desktop
- [Home](C:/Projetos/Tanque%20Aberto/reports/shell-public-final/screenshots/desktop/home.png)
- [Atualizações](C:/Projetos/Tanque%20Aberto/reports/shell-public-final/screenshots/desktop/atualizacoes.png)
- [Enviar](C:/Projetos/Tanque%20Aberto/reports/shell-public-final/screenshots/desktop/enviar.png)
- [Hub](C:/Projetos/Tanque%20Aberto/reports/shell-public-final/screenshots/desktop/hub.png)

## Validação

Executado com sucesso:
- `npm run typecheck`
- `npm run build`
- `npm run verify`

## Critério de aceite atendido

- CTA sem sobreposição ruim em mobile
- leitura mais rápida na primeira dobra
- shell mais leve
- navegação e CTA com hierarquia clara
- sem regressão visual óbvia nas quatro rotas capturadas
