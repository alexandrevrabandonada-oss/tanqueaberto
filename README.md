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
- Painel operacional interno com rotina, cobertura, prioridades e gatilhos manuais.
- RLS base para leitura pública, envio controlado e moderação restrita.
- PWA com manifest, service worker e ícones do sistema de marca.
- Base oficial de postos preparada para ingestão ANP + enriquecimento geográfico via OSM.

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
  geo/
  importers/
  normalizers/
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
scripts/
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
4. Rode `supabase/migrations/20260322_004_station_ingest.sql`.
5. Rode `supabase/seed/seed.sql` se quiser manter a massa mínima manual.
6. Verifique se o bucket `price-report-photos` existe e está público para leitura.
7. Cadastre os e-mails liberados para admin em `public.admin_users`.

## Administração
- A rota pública de login é `/admin/login`.
- O acesso administrativo usa Supabase Auth com e-mail e senha.
- Depois do login, o app valida se o e-mail está na allowlist `public.admin_users`.
- A moderação em `/admin` exige sessão válida e e-mail autorizado.

Exemplo de inclusão de admin:
```sql
insert into public.admin_users (email)
values ('admin@exemplo.com');
```

## Base oficial de postos
- A fonte principal dos postos é a ANP.
- O OpenStreetMap entra só como apoio cartográfico/geográfico.
- A importação aceita CSV ou JSON exportado da ANP.
- Se um posto vier sem coordenada, o importador pode tentar geocoding via OSM/Nominatim, com cache local e throttling.

Rodar importação:
```bash
npm run import:anp -- --file ./data/anp-postos.csv --cities "Volta Redonda,Barra Mansa,Resende" --enrich-geo
```

Opções úteis:
- `--file`: arquivo CSV ou JSON exportado da ANP.
- `--url`: link direto para o arquivo exportado.
- `--cities`: lista separada por vírgula.
- `--dry-run`: simula sem gravar.
- `--enrich-geo`: usa OSM/Nominatim só para coordenadas faltantes.
- `--cache-file`: arquivo de cache local para geocoding.

## Regras de deduplicação
1. `cnpj`, quando disponível.
2. `source` + `source_id`, quando houver identificador oficial.
3. `nome + endereço + cidade + bairro` como fallback.

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

## OSM
- O mapa já exibe atribuição do OpenStreetMap no Leaflet.
- A documentação e a UI devem manter isso visível.
- OSM não é fonte de verdade cadastral para postos, apenas apoio geográfico.

## Preparar Vercel
1. Suba o repositório no GitHub.
2. Importe o repositório na Vercel.
3. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
4. Valide a instalação PWA em mobile.
5. Ajuste o domínio público quando o nome final estiver fechado.

## Auditoria Pública e Histórico Longo

O app possui a camada pública de observatório em `/auditoria`, com páginas por cidade, posto, comparação entre cidades, relatórios recorrentes e metodologia.

### Rotas
- `/auditoria` - panorama regional
- `/auditoria/comparar` - comparação entre cidades
- `/auditoria/relatorios` - dossiês recorrentes e alertas persistidos
- `/auditoria/cidade/[slug]` - histórico municipal
- `/auditoria/posto/[id]` - histórico longo por posto
- `/auditoria/metodologia` - explicação pública da leitura
- `/auditoria/export?scope=overview|city|station&format=csv|pdf` - exportação básica

### Camada analítica
- Séries diárias e resumos 7/30/90 são calculados a partir de materialized views em `supabase/migrations/20260322_006_audit_analytics.sql`.
- A base recorrente cria `audit_station_groups`, `audit_report_runs` e `audit_alert_history` em `supabase/migrations/20260322_007_civic_dossiers.sql`.
- O refresh operacional das views é feito com `npm run audit:refresh` usando `DATABASE_URL` ou `SUPABASE_DB_URL`.
- A geração recorrente usa `npm run audit:dossiers` e pode gravar um relatório operacional em `reports/`.
- Os relatórios públicos mostram cobertura, confiança, tendência e alertas como padrões e indícios.

### Dados usados
- Apenas `price_reports` aprovados entram na série histórica.
- O cadastro territorial continua vindo de `stations`.
- Alertas públicos são apresentados como padrões e indícios, não como conclusão jurídica.

### Exportação
- CSV por posto, cidade ou panorama.
- PDF institucional com cabeçalho, cobertura, confiança, tendência, série, alertas, metodologia e observações recentes.

### Observação operacional
- Se você quiser expandir o histórico, o próximo passo é agendar o refresh das materialized views em um job diário ou semanal.
- O painel interno fica em `/admin/ops`.
- A rotina recorrente pode ser disparada manualmente com `npm run audit:refresh` e `npm run audit:dossiers`.
- Para preencher os grupos territoriais iniciais, rode `npm run ops:seed-groups -- --report reports/2026-03-22-estado-da-nacao-grupos-territoriais.md`.

## Próximos passos sugeridos
- Trocar o admin allowlist por um fluxo de convite simples, se necessário.
- Adicionar rate limit no envio quando o beta crescer.
- Melhorar estados de loading e erro em todas as rotas.
- Adicionar tendência e comparação por combustível na tela do posto.
- Preparar clustering de markers quando a base crescer.
- Criar métricas mínimas e monitoramento do fluxo de envio.
- Consolidar a rotina em cron real com alertas de falha.
- Curar os grupos territoriais com mais densidade editorial.

## Próximos prompts
- "Conecte o painel operacional a um cron real na Vercel."
- "Mostre falhas e duração das execuções no painel admin."
- "Adicione um recorte de cobertura por combustível em /admin/ops."
- "Inclua uma visão de lacunas do mapa com prioridade por coleta."
- "Melhore os PDFs recorrentes com um cabeçalho mais institucional."
- "Automatize o seed dos grupos territoriais após a importação ANP."

## Curadoria territorial

Depois da importação ANP, use estes comandos para operar a base:

```bash
npm run audit:stations -- --report reports/2026-03-22-estado-da-nacao-curadoria-territorial-da-base.md
npm run curate:stations -- --apply --report reports/2026-03-22-estado-da-nacao-curadoria-territorial-da-base.md
npm run regeo:stations -- --apply --report reports/2026-03-22-estado-da-nacao-segunda-curadoria-geografica.md
npm run audit:dossiers -- --report reports/2026-03-22-estado-da-nacao-dossies-civicos-recorrentes.md
```

Leitura rápida:
- `ok`: coordenada e revisão aceitáveis.
- `pending`: coordenada válida, mas ainda em revisão leve.
- `manual_review`: coordenada fraca ou ausente, fora do mapa público.
- O mapa público continua conservador e não exibe casos frágeis.

## Beta fechado e preview
- Para testar cenários com e sem preço recente, use `NEXT_PUBLIC_BOMBA_ABERTA_USE_FIXTURES=1` apenas em preview/dev.
- A lista pública de lacunas fica em `/postos/sem-atualizacao`.
- O checklist mínimo de beta está em [`docs/beta-launch-gate.md`](./docs/beta-launch-gate.md).

## Segurança operacional

Para beta fechado, consulte [docs/security-operational.md](/C:/Projetos/Tanque%20Aberto/docs/security-operational.md).
Esse documento explica rate limit do envio, logs administrativos, observabilidade mínima e leitura rápida de erros comuns.

## Beta fechado em domínio real

Quando `NEXT_PUBLIC_BETA_CLOSED=1`, o app passa por uma gate simples de convite.

Env vars principais:
- `NEXT_PUBLIC_SITE_URL`: URL pública final do domínio
- `NEXT_PUBLIC_BETA_CLOSED`: `1` para ativar a gate
- `BETA_INVITE_CODE`: código curto compartilhado com testers
- `BETA_COOKIE_SECRET`: opcional, reservado para futuras variações de assinatura

Rotas úteis:
- `/beta`: entrada controlada por convite
- `/feedback`: canal simples para testers
- `/postos/sem-atualizacao`: visão pública das lacunas

Para operação, consulte também [docs/security-operational.md](/C:/Projetos/Tanque%20Aberto/docs/security-operational.md) e [docs/beta-launch-gate.md](/C:/Projetos/Tanque%20Aberto/docs/beta-launch-gate.md).
