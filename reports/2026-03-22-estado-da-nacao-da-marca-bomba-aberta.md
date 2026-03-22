# Bomba Aberta - Estado da Nação da Marca

Data: 2026-03-22

## O que foi definido
- Sistema de marca com versões vertical, horizontal, símbolo, wordmark e monocromáticas.
- Paleta oficial com amarelo, preto/grafite, branco, cinzas e vermelho de alerta.
- Regras de uso por contexto: app, PWA, avatar, favicon, splash e peças editoriais.
- Integração da marca no header do app e na página Sobre.
- Metadados do app preparados para compartilhamento social e preview institucional.

## O que foi entregue
- Arquivos em `/public/brand` com as versões principais da marca.
- Ícones do app e do PWA alinhados ao novo sistema.
- Componente reutilizável `BrandMark` para consumo no produto.
- Guia curto de identidade em `docs/brand-guide.md`.

## Onde usar cada versão
- Vertical: abertura, splash, Sobre, apresentações.
- Horizontal: header, navbar, topo de telas.
- Símbolo: ícone do app, favicon, avatar, marcador pequeno.
- Wordmark: thumbnails e assinaturas textuais.
- Monocromáticas: fundos com conflito de contraste.

## Riscos visuais ainda existentes
- A marca em SVG com texto depende da renderização de fonte no ambiente do usuário.
- O símbolo precisa ser monitorado em microtamanhos reais para evitar perda de leitura.
- O sistema ainda não tem pacote raster exportado para todos os casos editoriais.

## Próximos passos recomendados
- Exportar PNGs oficiais para loja, social e imprensa.
- Criar splash screen estática e versão animada curta.
- Gerar kit de avatar, thumb e cards sociais padronizados.
- Testar a marca em fundos fotográficos e modos de alto contraste.
