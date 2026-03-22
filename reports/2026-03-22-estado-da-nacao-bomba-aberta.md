# Bomba Aberta - Estado da Nacao

Data: 2026-03-22

## O que foi criado
- Scaffold inicial do app em Next.js com App Router.
- Estrutura mobile-first com mapa, feed, detalhe de posto, envio, sobre e admin placeholder.
- Design system base com tokens, botao, FAB, badge e card.
- PWA instalavel com manifest, service worker e icones placeholder.
- Integracao inicial com Supabase para client browser e server.
- Schema inicial com `stations`, `price_reports`, `admin_users`, policies e bucket de fotos.
- Seed e mocks regionais com Volta Redonda, Barra Mansa e Resende.
- View auxiliar para leitura de ultimos precos aprovados.

## Estrutura de pastas
- `app/`: rotas e layouts do produto.
- `components/`: shell, mapa, posto e UI base.
- `lib/`: tipos, utilitarios, mocks e Supabase.
- `styles/`: tokens de design.
- `public/`: manifest, icones e service worker.
- `supabase/`: migration e seed.
- `docs/`: plano de implementacao.
- `reports/`: relatorios executivos.

## Pendencias
- Conectar as rotas aos dados reais do Supabase.
- Implementar upload de fotos no fluxo de envio.
- Criar autenticacao para o admin.
- Adicionar busca real por posto, bairro e cidade.
- Melhorar estados vazios, loading e erro.

## Riscos
- Dependencia forte de recencia e qualidade de dado enviado pelo usuario.
- Moderacao fraca pode gerar ruido ou fraude se entrar em producao cedo demais.
- Mapa mobile pode ficar pesado se muitos pontos forem renderizados sem clusterizacao.
- Upload de foto exige cuidado com tamanho, latencia e confianca na conexao.

## Proximos passos recomendados
- Ligar leitura de postos e reports ao Supabase.
- Construir o formulario real de envio com foto e timestamp.
- Proteger `/admin` com auth simples.
- Criar filtros por combustivel e destaque de recencia.
- Preparar deploy na Vercel com variaveis de ambiente.
