# Bomba Aberta - Estado da Nação da Marca Aplicada no Produto

Data: 2026-03-22

## O que foi aplicado
- Header do app refinado para usar a marca horizontal/compacta com símbolo no topo.
- Página Sobre fortalecida com a marca vertical em uso editorial/institucional.
- Loading global com símbolo da marca e mensagem curta de carregamento.
- Offline screen com presença de marca e tratamento visual mais acabado.
- PWA icons e favicon alinhados ao novo sistema.
- Manifest atualizado para usar os assets oficiais da marca.
- Metadados públicos com Open Graph e Twitter card apontando para preview institucional.
- Estados vazios comuns reforçados com o símbolo reduzido e estrutura visual padronizada.

## Versões usadas por contexto
- `vertical`: Sobre, abertura institucional, peças editoriais.
- `horizontal`: header/topbar e uso principal dentro do app.
- `symbol`: loading, offline, estados vazios, favicon e PWA icon.
- `wordmark`: asset disponível para materiais editoriais e uso futuro.
- `mono-*`: reserva para fundos com conflito de contraste e aplicações específicas.

## Arquivos-chave
- [app/layout.tsx](/C:/Projetos/Tanque%20Aberto/app/layout.tsx)
- [components/layout/app-shell.tsx](/C:/Projetos/Tanque%20Aberto/components/layout/app-shell.tsx)
- [components/brand/brand-mark.tsx](/C:/Projetos/Tanque%20Aberto/components/brand/brand-mark.tsx)
- [components/brand/pwa-splash.tsx](/C:/Projetos/Tanque%20Aberto/components/brand/pwa-splash.tsx)
- [app/loading.tsx](/C:/Projetos/Tanque%20Aberto/app/loading.tsx)
- [app/offline/page.tsx](/C:/Projetos/Tanque%20Aberto/app/offline/page.tsx)
- [app/sobre/page.tsx](/C:/Projetos/Tanque%20Aberto/app/sobre/page.tsx)
- [components/state/empty-state-card.tsx](/C:/Projetos/Tanque%20Aberto/components/state/empty-state-card.tsx)
- [public/manifest.webmanifest](/C:/Projetos/Tanque%20Aberto/public/manifest.webmanifest)
- [public/favicon.svg](/C:/Projetos/Tanque%20Aberto/public/favicon.svg)
- [public/brand/og-preview.svg](/C:/Projetos/Tanque%20Aberto/public/brand/og-preview.svg)

## Riscos de legibilidade ainda existentes
- As versões SVG com texto dependem da fonte do dispositivo renderizar bem em todos os ambientes.
- O símbolo em microtamanho ainda precisa de teste real em ícones de home screen e favicons em navegadores diferentes.
- O preview social é sólido em SVG, mas uma versão raster ainda seria útil para controle fino de plataformas.
- Em fundos fotográficos mais complexos, a versão horizontal precisa de contraste controlado para não perder leitura.

## Próximos passos recomendados
- Exportar pacote raster oficial para `512`, `192`, `180`, `32` e `16` pixels.
- Gerar splash PNG para instalação PWA em iOS e Android.
- Testar o ícone do app em home screen real no iPhone e em Android.
- Criar variações sociais quadrada e horizontal para imprensa e compartilhamento.
- Fechar um pequeno manual visual com exemplos de uso correto e incorreto.

## Estado final
A marca deixou de ser só um símbolo e virou um sistema usável dentro do produto. O app agora conversa com a identidade de forma consistente, mas sem exagero: o foco continua em mapa, preço e recência, com presença visual suficiente para parecer produto real e memorável.
