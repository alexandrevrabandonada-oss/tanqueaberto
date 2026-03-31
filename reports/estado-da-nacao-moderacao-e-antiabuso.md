# Estado da Nação: moderação e antiabuso

## Resumo executivo

Fechei a camada de antiabuso do envio colaborativo sem exigir login, sem barrar o primeiro envio e sem mexer em branding ou layout.

O que passou a existir nesta passada:
- rate limit por `ip`, `device`, `session` e `surface`
- detecção mais forte de duplicado provável e recência de preço
- validação mínima de foto mantida no servidor, com aviso claro para refazer a foto quando necessário
- trilha de auditoria na moderação administrativa com evento `moderated`
- feedback explícito para o usuário quando o envio entra em revisão ou quando há preço recente

## Auditoria feita

Superfícies auditadas:
- `app/enviar/actions.ts`
- `components/forms/price-submit-form.tsx`
- `app/admin/actions.ts`
- `lib/ops/rate-limit.ts`
- `supabase/migrations/20260327_021_submission_hardening.sql`

Sinais e integrações observados:
- `collector_trust` continua sendo atualizado na moderação administrativa
- `operational_events` continua sendo a trilha operacional de proteção e revisão
- `report_submission_rate_limits` agora guarda escopos mais finos de limitação
- `price_report_audit_events` registra criação e moderação do report

## O que mudou

### 1. Rate limit com escopos reais

Antes:
- só existia limitação básica por IP + posto + combustível

Agora:
- `ip` em janela curta
- `device` para navegador persistente
- `session` para continuidade local
- `surface` para impedir abuso repetitivo em uma superfície específica

### 2. Detecção de duplicação e recência

Antes:
- a lógica olhava sobretudo hash da foto e preço pendente recente

Agora:
- o envio coleta preço recente no mesmo posto/combustível
- `duplicateLikely` combina foto repetida, mesma reconciliação e mesma leitura recente
- `alreadyRecentPrice` separa o caso em que existe preço recente, mas o envio ainda pode seguir sem virar falso positivo de spam

### 3. Feedback explícito ao usuário

Antes:
- o usuário recebia erro genérico ou sucesso seco

Agora:
- `Precisa refazer a foto`
- `Duplicado provável`
- `Entrou em revisão`
- `Já existe preço recente`

Esse feedback aparece sem adicionar novos passos no primeiro envio.

### 4. Auditoria administrativa

Antes:
- a moderação atualizava o report e o trust, mas não deixava uma trilha auditável própria do evento de moderação

Agora:
- cada aprovação/rejeição escreve um evento `moderated` em `price_report_audit_events`
- o payload leva decisão, nota, versão e report agrupado

## Matriz de risco

| Risco | Antes | Depois |
|---|---|---|
| Spam por repetição rápida | Alto | Médio-baixo |
| Duplicação acidental | Alto | Baixo |
| Abuso distribuído por navegador/sessão | Alto | Baixo |
| Ruído operacional por leitura recente | Médio-alto | Médio |
| Falso bloqueio do usuário bom | Médio | Baixo |
| Falta de trilha na moderação | Alto | Baixo |
| Falta de feedback útil ao usuário | Alto | Baixo |

## Diferença funcional por superfície

### `/enviar`
- primeiro envio segue sem login
- foto continua obrigatória
- envio pode entrar em revisão sem bloquear a rua
- o usuário passa a ver se o caso entrou em revisão, duplicou ou só encontrou preço recente

### `/admin`
- permanece com auth forte
- moderação escreve trilha auditável própria
- trust continua sendo recalculado na decisão administrativa

### `report_submission_rate_limits`
- continua sendo a base de persistência para proteção contra abuso
- agora registra escopo e contexto suficientes para limitar melhor sem penalizar o usuário bom

## Diff focado

Arquivos efetivamente ajustados nesta passada:
- `app/enviar/actions.ts`
- `components/forms/price-submit-form.tsx`
- `app/admin/actions.ts`
- `lib/ops/rate-limit.ts`
- `supabase/migrations/20260327_021_submission_hardening.sql`

## Telemetria e eventos

Eventos operacionais e de produto usados nesta passada:
- `submission_accepted`
- `submission_reviewed`
- `submission_failed`
- `submission_quality_flagged`
- `moderation_approved`
- `moderation_rejected`
- `moderated`

## Validação

Executado com sucesso:
- `npm run typecheck`
- `npm run build`
- `npm run verify`

## Nota de contexto

O worktree já tinha alterações paralelas em outras superfícies e relatórios. Esta passada foi concentrada na camada de envio, moderação e rate limit, sem reverter o restante.
