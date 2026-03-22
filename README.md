# Bomba Aberta

PWA mobile-first do VR Abandonada para mapear preços de combustíveis no Sul Fluminense com foco em mapa, recência, foto como evidência e consulta rápida.

## Visão do produto
O app funciona como um "Waze popular" dos combustíveis: pessoas consultam postos no mapa, veem o último preço validado por combustível, acessam histórico recente e enviam novos registros com foto, data e hora.

## Stack
- Next.js com App Router
- TypeScript
- Tailwind CSS
- Supabase
- Leaflet + OpenStreetMap
- PWA instalável
- Vercel-ready e Github-ready

## O que está funcional nesta etapa
- Home carregando postos reais e preços aprovados do Supabase.
- Mapa real com markers dos postos ativos.
- Tela de posto com preços recentes, histórico e foto da última atualização.
- Feed de atualizações recentes vindo do banco.
- Fluxo real de envio com upload de foto para o Supabase Storage e insert como `pending`.
- Admin mínimo funcional com fila real de pendências e ações de aprovar/rejeitar.
- PWA com manifest, service worker e ícones placeholders.
- Schema inicial e seed regional.
- Camada clara de acesso a dados em `lib/data`, `lib/format`, `lib/supabase` e `types`.

## Estrutura principal
```text
app/
  admin/
  atualizacoes/
  enviar/
  offline/
  postos/[id]/
  sobre/
components/
  forms/
  layout/
  map/
  station/
  ui/
lib/
  data/
  format/
  supabase/
types/
styles/
public/
  icons/
supabase/
  migrations/
  seed/
docs/
reports/
```

## Rodar local
1. Instale dependências.
   ```bash
   npm install
   ```
2. Crie o arquivo de ambiente.
   ```bash
   cp .env.example .env.local
   ```
3. Preencha as variáveis.
   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
4. Rode o app.
   ```bash
   npm run dev
   ```

## Supabase
1. Crie um projeto no Supabase.
2. Rode `supabase/migrations/20260322_001_init.sql`.
3. Rode `supabase/seed/seed.sql`.
4. Verifique se o bucket `price-report-photos` foi criado.
5. Se quiser testar o admin com RLS real no futuro, cadastre usuários em `public.admin_users`.

## Upload de fotos
- O envio usa upload direto no bucket `price-report-photos`.
- O nome do arquivo é padronizado por posto e timestamp.
- O report entra como `pending` para moderação.

## Preparar Vercel
1. Suba o repositório no GitHub.
2. Importe o repo na Vercel.
3. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
4. Valide a instalação PWA em mobile.
5. Ajuste o domínio público quando o nome final estiver fechado.

## Próximos passos sugeridos
- Adicionar busca por posto, bairro e cidade.
- Criar estados de loading e erro mais ricos.
- Implementar autenticação real para o admin.
- Adicionar métricas e tendências por combustível.
- Melhorar o fallback offline e a experiência sem conexão.

## Próximos prompts
- "Troque o admin mínimo por autenticação Supabase com RLS real."
- "Adicione busca por posto, bairro e cidade na home e no mapa."
- "Crie um resumo visual de preço por combustível na tela do posto."
- "Implemente estados de loading e empty state mais fortes para todas as rotas."
- "Adicione clustering de markers no mapa quando o volume crescer."
