# Estado da Nação — Redesenho de Favicon e App Icons

Data: 2026-03-25
Projeto: Bomba Aberta

## Objetivo
Substituir o sistema anterior de favicon e app icons por uma família mais legível, forte e coerente com a identidade VR Abandonada / Bomba Aberta, usando:
- ARTE 2 como base principal do favicon e dos app icons
- ARTE 1 como base do wordmark horizontal para superfícies largas
- ARTE 3 como selo institucional secundário

## Direção Aplicada
- Favicon e app icons: derivados da bomba simples, com silhueta limpa, sem texto e leitura forte em tamanhos pequenos.
- Wordmark horizontal: derivado da arte horizontal com nome, usado para branding interno, loading, splash e superfícies largas.
- Selo institucional: derivado da arte complexa, mantido como apoio institucional e não como ícone principal.

## Inspeção do Projeto
Locais revisados antes da alteração:
- `app/layout.tsx`
- `public/manifest.webmanifest`
- `public/sw.js`
- `components/brand/brand-mark.tsx`
- `lib/beta/gate.ts`
- `lib/dev/preview-data.ts`
- `public/brand/*`
- `public/icons/*`
- `public/favicon.svg`

## Arquivos Gerados
### Raiz de `public`
- `favicon.ico`
- `favicon.svg`
- `favicon-16.png`
- `favicon-32.png`
- `favicon-48.png`
- `icon-192.png`
- `icon-512.png`
- `icon-master-1024.png`
- `maskable-icon-192.png`
- `maskable-icon-512.png`
- `apple-touch-icon.png`

### Sistema canônico de marca
#### `public/brand/bomba-aberta/icon/`
- `bomba-aberta-icon.svg`
- `bomba-aberta-icon-master-1024.png`
- `bomba-aberta-icon-512.png`
- `bomba-aberta-icon-192.png`
- `bomba-aberta-icon-maskable-512.png`
- `bomba-aberta-icon-maskable-192.png`
- `apple-touch-icon.png`
- `favicon-48.png`
- `favicon-32.png`
- `favicon-16.png`

#### `public/brand/bomba-aberta/logo/`
- `bomba-aberta-logo-horizontal.svg`
- `bomba-aberta-logo-horizontal-dark.svg`
- `bomba-aberta-logo-horizontal-dark.png`
- `bomba-aberta-logo-og.svg`
- `bomba-aberta-logo-og.png`

#### `public/brand/bomba-aberta/emblem/`
- `bomba-aberta-emblem.svg`
- `bomba-aberta-emblem-dark.svg`
- `bomba-aberta-emblem-dark.png`
- `bomba-aberta-emblem-transparent.png`

## Mapeamento Final de Uso
### Ícone principal derivado da ARTE 2
Usado em:
- favicon do navegador
- ícones principais da PWA
- ícones do manifest
- atalhos/launcher
- apple touch icon
- referências compatíveis em raiz de `public`

Arquivos conectados:
- `app/layout.tsx`
- `public/manifest.webmanifest`
- `public/sw.js`
- `lib/beta/gate.ts`

### Wordmark horizontal derivado da ARTE 1
Usado em:
- branding interno por `BrandMark`
- superfícies horizontais
- preview social / Open Graph / Twitter

Arquivos conectados:
- `components/brand/brand-mark.tsx`
- `app/layout.tsx`
- `lib/dev/preview-data.ts`
- `public/sw.js`

### Selo institucional derivado da ARTE 3
Uso reservado para:
- superfícies institucionais
- apoio de marca secundário
- contextos amplos em que a riqueza visual compensa

Observação:
- não foi ligado como favicon
- não foi ligado como app icon principal

## Referências Atualizadas
### Metadata do Next.js
Em `app/layout.tsx`:
- favicon principal: `/favicon.ico`
- svg any-size: `/favicon.svg`
- pngs de apoio: `/favicon-16.png`, `/favicon-32.png`, `/favicon-48.png`
- app icon: `/icon-192.png`
- apple touch: `/apple-touch-icon.png`
- imagem social: `/brand/bomba-aberta/logo/bomba-aberta-logo-og.png`

### Manifest
Em `public/manifest.webmanifest`:
- `any`: `/favicon.svg`
- `192`: `/icon-192.png`
- `512`: `/icon-512.png`
- `maskable`: `/maskable-icon-192.png`, `/maskable-icon-512.png`

### Service Worker
Em `public/sw.js`:
- cache shell atualizado para incluir os novos favicons e app icons
- versão do cache incrementada para forçar renovação do cliente

### Beta Gate
Em `lib/beta/gate.ts`:
- bypass explícito para os novos ícones na raiz de `public`, evitando bloqueio em preview/beta

## Referências Antigas
Substituídas no runtime:
- referências antigas de favicon/icon fora do novo sistema
- referência social que apontava para a peça institucional antiga

Ainda presentes no disco, mas sem uso runtime:
- alguns assets legados em `public/icons/*`
- arquivos históricos antigos dentro de `public/brand/*`
- `bomba-aberta-emblem-og.*` legado, sem referência ativa

## Validação Técnica
Comandos executados:
- `npx tsx scripts/generate-brand-assets.ts`
- `npm run build`

Resultado:
- build aprovado
- metadata, manifest, cache shell e preview social consistentes com o novo sistema

Avisos não bloqueantes já existentes no projeto:
- warnings de `react-hooks/exhaustive-deps`
- aviso conhecido de uso dinâmico em `/hub` por `cookies`

## Critérios Visuais Atendidos
- leitura forte em 16x16, 32x32 e 48x48
- sem texto no favicon
- sem selo complexo no launcher icon
- identidade preta + amarela preservada
- glow reduzido a linguagem de apoio, sem depender dele para leitura
- coerência entre favicon, launcher e branding interno

## Checklist Final
- [x] favicon principal trocado
- [x] `favicon.ico` gerado
- [x] `favicon.svg` gerado
- [x] `icon-192.png` gerado e ligado
- [x] `icon-512.png` gerado e ligado
- [x] `maskable-icon-512.png` gerado e ligado
- [x] `apple-touch-icon.png` gerado e ligado
- [x] manifest revisado
- [x] metadata do Next.js revisada
- [x] cache shell/PWA revisado
- [x] preview social revisado
- [x] fallback antigo de runtime revisado
- [x] build validado

## Conclusão
O sistema final de ícones passa a operar com uma hierarquia correta:
- ARTE 2: reconhecimento rápido e uso de sistema
- ARTE 1: branding horizontal e presença nominal
- ARTE 3: institucional e apoio

Isso reduz ruído, melhora legibilidade em tamanhos pequenos e deixa o app com uma assinatura visual mais coerente entre navegador, PWA instalada e superfícies internas.
