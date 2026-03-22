# Bomba Aberta

PWA mobile-first do VR Abandonada para mapear preços de combustíveis no Sul Fluminense com foco em mapa, recência, foto como evidência e consulta rápida.

## Visão do produto
O app funciona como um "Waze popular" dos combustíveis: as pessoas consultam postos no mapa, veem o último preço validado por combustível, acessam histórico recente e enviam novos registros com foto, data e hora.

## Stack
- Next.js com App Router
- TypeScript
- Tailwind CSS
- Supabase
- Leaflet + OpenStreetMap
- PWA instalável
- Vercel-ready e GitHub-ready

## O que está funcional nesta etapa
- Home com mapa real do Sul Fluminense, busca por posto/bairro/cidade e filtros por combustível e recência.
- Mapa com markers dos postos ativos e clique levando para a tela do posto.
- Tela de posto com preços recentes, resumo por combustível, histórico e foto da última atualização.
- Feed de atualizações recentes com filtros públicos.
- Fluxo real de envio com validação no servidor, upload de foto para o Supabase Storage e insert como `pending`.
- Admin com login real via Supabase Auth, allowlist por e-mail e fila de moderação protegida.
- RLS base para leitura pública, envio controlado e moderação restrita.
- PWA com manifest, service worker e ícones do sistema de marca.
- Schema inicial, seed regional e camada clara de acesso a dados em `lib/data`, `lib/format`, `lib/filters`, `lib/supabase`, `lib/auth`, `lib/upload` e `types`.

## Estrutura principal
```text
app/
  admin/
    login/
  atualizacoes/
  enviar/
  offline/
  postos/[id]/
  sobre/
components/
  admin/
  brand/
  feed/
  forms/
  home/
  layout/
  map/
  station/
  state/
  ui/
lib/
  auth/
  data/
  filters/
  format/
  supabase/
  upload/
types/
styles/
public/
  brand/
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

## Verificação local
- `npm run typecheck` roda `tsc --noEmit`.
- `npm run lint` valida o código.
- `npm run build` gera a build final.

## Supabase
1. Crie um projeto no Supabase.
2. Rode `supabase/migrations/20260322_001_init.sql`.
3. Rode `supabase/migrations/20260322_003_security.sql`.
4. Rode `supabase/seed/seed.sql`.
5. Verifique se o bucket `price-report-photos` existe e está público para leitura.
6. Cadastre os e-mails liberados para admin em `public.admin_users`.

## Admin
- A rota pública de login é `/admin/login`.
- O acesso administrativo usa Supabase Auth com e-mail e senha.
- Depois do login, o app valida se o e-mail está na allowlist `public.admin_users`.
- A moderação em `/admin` exige sessão válida e e-mail autorizado.

Exemplo de inclusão de admin:
```sql
insert into public.admin_users (email)
values ('admin@exemplo.com');
```

## Upload de fotos
- O envio usa upload no bucket `price-report-photos` via ação de servidor.
- O nome do arquivo é padronizado por posto e timestamp.
- Fotos públicas são lidas por URL pública do bucket.
- O report entra como `pending` para moderação.

## RLS e segurança
- `stations`: leitura pública apenas de postos ativos; admin pode ler tudo.
- `price_reports`: leitura pública apenas de reports aprovados; admin pode ler tudo; escrita pública é controlada pelo fluxo de servidor; moderação é restrita.
- `admin_users`: leitura restrita ao próprio e-mail autenticado.
- `storage.objects`: leitura pública para fotos do bucket; gestão administrativa restrita.

## Preparar Vercel
1. Suba o repositório no GitHub.
2. Importe o repositório na Vercel.
3. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
4. Valide a instalação PWA em mobile.
5. Ajuste o domínio público quando o nome final estiver fechado.

## Próximos passos sugeridos
- Trocar o admin allowlist por um fluxo de convite simples, se necessário.
- Adicionar rate limit no envio quando o beta crescer.
- Melhorar estados de loading e erro em todas as rotas.
- Adicionar tendência e comparação por combustível na tela do posto.
- Preparar clustering de markers quando a base crescer.
- Criar métricas mínimas e monitoramento do fluxo de envio.

## Próximos prompts
- "Aplique uma estratégia de rate limit simples no envio público."
- "Adicione filtros por combustível também na tela de atualizações."
- "Crie uma visão de tendência por combustível na tela do posto."
- "Implemente clustering de markers no mapa quando houver mais postos."
- "Melhore os estados de loading e empty state com mais contexto e ação."
