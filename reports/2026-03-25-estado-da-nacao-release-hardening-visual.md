# Estado da Nacao - Release Hardening Visual

Data: 2026-03-25

## Resumo

Executei uma matriz minima de regressao visual para o Bomba Aberta, cobrindo as quatro viewports pedidas e os estados criticos do produto.

A cobertura ficou assim:

- `mobile portrait`
- `tablet`
- `desktop`
- `PWA instalada / janela larga`
- `home/mapa`
- `atualizacoes`
- `enviar`
- `Meu Hub`
- `sticky topo`
- `snapshot offline`
- `GPS ativo`
- `missao ativa`

## Arquivos Principais

- [scripts/release-hardening-visual.cjs](C:/Projetos/Tanque%20Aberto/scripts/release-hardening-visual.cjs)
- [scripts/capture-release-hardening-home.cjs](C:/Projetos/Tanque%20Aberto/scripts/capture-release-hardening-home.cjs)
- [package.json](C:/Projetos/Tanque%20Aberto/package.json)

## Capturas Por Estado

### Home / Mapa

- [home neutral mobile](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/home-neutral-mobile.png)
- [home neutral tablet](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/home-neutral-tablet.png)
- [home neutral desktop](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/home-neutral-desktop.png)
- [home neutral pwa-wide](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/home-neutral-pwa-wide.png)
- [home sticky desktop](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/home-sticky-desktop.png)
- [home snapshot offline desktop](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/home-snapshot-offline-desktop.png)
- [home GPS ativo desktop](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/home-gps-active-desktop.png)
- [home missao ativa desktop](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/home-mission-active-desktop.png)
- [home standalone pwa-wide](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/home-standalone-pwa-wide.png)

### Atualizacoes

- [atualizacoes neutral mobile](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/atualizacoes-neutral-mobile.png)
- [atualizacoes neutral tablet](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/atualizacoes-neutral-tablet.png)
- [atualizacoes neutral desktop](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/atualizacoes-neutral-desktop.png)
- [atualizacoes neutral pwa-wide](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/atualizacoes-neutral-pwa-wide.png)

### Enviar

- [enviar neutral mobile](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/enviar-neutral-mobile.png)
- [enviar neutral tablet](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/enviar-neutral-tablet.png)
- [enviar neutral desktop](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/enviar-neutral-desktop.png)
- [enviar neutral pwa-wide](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/enviar-neutral-pwa-wide.png)

### Meu Hub

- [hub neutral mobile](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/hub-neutral-mobile.png)
- [hub neutral tablet](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/hub-neutral-tablet.png)
- [hub neutral desktop](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/hub-neutral-desktop.png)
- [hub neutral pwa-wide](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/hub-neutral-pwa-wide.png)

## Resultado Visual

Revisao manual das capturas prontas indica:

- Clipping visivel: 0
- Overlap visivel: 0
- CTA fora do eixo: 0
- Nav obstruindo conteudo: 0

## Pendencia Manual

- [home standalone pwa-wide](C:/Projetos/Tanque%20Aberto/reports/release-hardening-visual/home-standalone-pwa-wide.png) ainda caiu no shell de carregamento na automacao. Isso e um bom candidato para confirmacao em dispositivo real ou em uma emulacao PWA mais precisa antes de abrir o beta.

## Leitura Final

O pacote visual esta forte para deploy no conjunto principal de rotas e estados de shell. O unico ponto que eu nao fecharia sem uma ultima confirmacao manual e o standalone wide, porque ele nao mostrou o produto pronto na captura automatizada.

