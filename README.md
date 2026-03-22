# Bomba Aberta

PWA mobile-first do VR Abandonada para mapear preços de combustíveis no Sul Fluminense com foco em mapa, recência, foto como evidência e consulta rápida.

## Visao do produto
O app funciona como um "Waze popular" dos combustiveis: pessoas consultam postos no mapa, veem o ultimo preco validado por combustivel, acessam historico recente e enviam novos registros com foto, data e hora.

## Stack
- Next.js com App Router
- TypeScript
- Tailwind CSS
- Supabase
- Leaflet + OpenStreetMap
- PWA instalavel
- Vercel-ready e Github-ready

## O que esta pronto nesta fundacao
- Estrutura inicial limpa e escalavel.
- Design system base com tokens, botao, FAB, badge e card.
- Header mobile-first e bottom navigation.
- Home com mapa funcional e mocks regionais.
- Pagina de posto, envio, feed, sobre/metodologia e admin placeholder.
- PWA com manifest, service worker e icones placeholder.
- Camada inicial de Supabase para client e server.
- Schema inicial e seed com postos de Volta Redonda, Barra Mansa e Resende.
- View auxiliar para ler o ultimo preco aprovado por posto/combustivel.

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
  layout/
  map/
  station/
  ui/
lib/
  mock-data.ts
  types.ts
  utils.ts
  supabase/
styles/
  design-tokens.ts
public/
  icons/
supabase/
  migrations/
  seed/
docs/
reports/
```

## Rodar local
1. Instale dependencias.
   ```bash
   npm install
   ```
2. Crie o arquivo de ambiente.
   ```bash
   cp .env.example .env.local
   ```
3. Preencha as variaveis.
   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
4. Rode o app.
   ```bash
   npm run dev
   ```

## Conectar Supabase
1. Crie um projeto no Supabase.
2. Execute `supabase/migrations/20260322_001_init.sql`.
3. Execute `supabase/seed/seed.sql`.
4. Configure o bucket `price-report-photos` se necessario.
5. Cadastre futuros admins em `public.admin_users`.

## Preparar Vercel
1. Suba o repositorio no GitHub.
2. Importe o repo na Vercel.
3. Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Valide instalacao PWA em mobile.
5. Ajuste o dominio publico quando o nome final estiver fechado.

## Proximos passos sugeridos
- Ligar a home a consultas reais do Supabase.
- Criar formulario real de envio com upload para Storage.
- Proteger o admin com auth simples.
- Adicionar busca por posto, bairro e cidade.
- Criar agregacoes por combustivel e alertas de recencia.

## Proximos prompts
- "Troque os mocks por consultas reais ao Supabase mantendo o layout atual."
- "Implemente o fluxo real de envio com upload de foto e insert em `price_reports`."
- "Adicione busca por posto, cidade e bairro na home."
- "Proteja `/admin` com autenticacao simples do Supabase."
- "Crie a camada de estados vazios e erro para o mapa e o feed."
