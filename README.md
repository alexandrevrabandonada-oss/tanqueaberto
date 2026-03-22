# Tanque Aberto

PWA mobile-first para mapear e validar precos de combustiveis no Sul Fluminense com evidencia fotografica, recencia explicita e moderacao simples.

## Stack
- Next.js + App Router
- TypeScript
- Tailwind CSS v4
- Leaflet + OpenStreetMap
- Supabase (database, auth e storage)
- Vercel

## O que esta pronto neste scaffold
- Base visual mobile-first alinhada ao conceito VR Abandonada.
- Rotas iniciais para mapa, detalhe do posto, envio, feed e admin.
- Service worker, manifest e icones-base do PWA.
- Camada mockada pronta para troca por Supabase.
- Schema SQL inicial com tabelas, enums, storage bucket e policies.
- Seed com postos de Volta Redonda e Barra Mansa.

## Estrutura
```text
app/
  admin/
  atualizacoes/
  enviar/
  offline/
  postos/[id]/
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
public/
  icons/
supabase/
  migrations/
  seed/
docs/
```

## Setup local
1. Instale dependencias:
   ```bash
   npm install
   ```
2. Copie o arquivo de ambiente:
   ```bash
   cp .env.example .env.local
   ```
3. Preencha:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
4. Rode o app:
   ```bash
   npm run dev
   ```

## Setup Supabase
1. Crie um projeto no Supabase.
2. Rode a migration em `supabase/migrations/20260322_001_init.sql`.
3. Rode o seed em `supabase/seed/seed.sql`.
4. Crie um usuario admin e insira o `auth.users.id` em `public.admin_users`.
5. Configure o bucket `price-report-photos` caso nao aplique via SQL.

## Integracao inicial sugerida
- Home: buscar `stations` ativos e o preco aprovado mais recente por combustivel.
- Detalhe do posto: buscar historico aprovado ordenado por `reported_at desc`.
- Envio: upload da foto no bucket e insert em `price_reports` com status `pending`.
- Admin: listar `pending` e permitir update de status.

## Checklist GitHub + Vercel + Supabase
- Criar repositorio GitHub para o projeto.
- Subir este scaffold para a branch principal.
- Importar o repo na Vercel.
- Adicionar variaveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` na Vercel.
- Configurar dominio quando o nome final do produto fechar.
- Validar instalacao PWA em iPhone e Android.
- Validar permissao de camera e upload mobile.

## Proximos prompts objetivos
- "Implemente a busca por posto, bairro e cidade na home usando dados mockados primeiro."
- "Troque os mocks por consultas reais ao Supabase com server components."
- "Implemente o formulario real de envio com upload de foto para o Supabase Storage."
- "Crie autenticacao admin no Supabase e proteja a rota `/admin`."
- "Adicione filtros por combustivel e destaque visual para preco atualizado nas ultimas 2 horas."
