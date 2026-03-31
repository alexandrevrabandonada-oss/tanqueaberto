# Estado da Nação: histórico persistido de cobertura territorial

## Diagnóstico curto

Antes, a leitura de cobertura territorial dependia só de inferência entre janelas. Isso ajudava a operar, mas deixava a base histórica frágil: dava para ver tendência, porém não havia snapshot persistido real por cidade e bairro.

Agora existe um histórico materializado com snapshots diários ou semanais, permitindo acompanhar evolução real sem perder a leitura operacional curta que já existia em cobertura territorial e impacto de semeadura.

## O que foi entregue

### Persistência de snapshots

- Tabela nova em `supabase/migrations/20260330_025_territorial_coverage_snapshots.sql`
- Snapshot por cidade e bairro com:
  - total de postos
  - total com preço recente
  - total sem preço recente
  - total em revisão
  - total sem atualização
  - cobertura boa / fraca / vazia
  - sinais operacionais compactos
  - referência do job que gerou o snapshot
- Política de leitura restrita a admin

### Geração periódica

- Job novo de snapshot no scheduler
- Rota cron em `app/api/cron/audit/coverage-snapshot/route.ts`
- Integração com o fluxo de jobs operacionais já existente

### Leitura histórica

- Página nova em `app/admin/ops/historico-cobertura-territorial/page.tsx`
- Resumo por período com `30`, `90` e `180` dias
- Evolução por cidade
- Evolução por bairro
- Bairros que melhoraram
- Bairros estagnados

### Compatibilidade preservada

- A leitura atual de impacto da semeadura continua funcionando
- A página histórica é aditiva, não substitui a leitura por janela
- O painel de `admin/ops` ganhou atalhos para a nova visão sem ficar mais pesado

## Antes / Depois

### Antes

- A cobertura territorial dependia de inferência entre janelas
- A leitura de evolução era útil, mas não persistida
- Não havia histórico real para comparar snapshots ao longo do tempo

### Depois

- Passou a existir snapshot persistido por cidade e bairro
- A operação agora consegue ver evolução real ao longo do tempo
- A inferência continua como compatibilidade, mas deixa de ser a única fonte de histórico

## Números

- Rota nova: `/admin/ops/historico-cobertura-territorial`
- First Load JS da rota: `106 kB`
- Route size: `178 B`
- Shared JS global: `103 kB`

## Leitura operacional

- Use o histórico persistido para saber se uma cidade ou bairro melhorou de verdade
- Use os bairros melhorados para replicar o padrão
- Use os bairros estagnados para mutirão e semeadura
- Use a cobertura atual quando a pergunta for o estado presente, e o histórico quando a pergunta for evolução

## Validação

- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou

## Arquivos principais

- `supabase/migrations/20260330_025_territorial_coverage_snapshots.sql`
- `lib/ops/territorial-coverage-snapshots.ts`
- `lib/ops/scheduler.ts`
- `app/api/cron/audit/coverage-snapshot/route.ts`
- `app/admin/ops/historico-cobertura-territorial/page.tsx`
- `app/admin/ops/page.tsx`
- `app/admin/ops/cobertura-territorial/page.tsx`
