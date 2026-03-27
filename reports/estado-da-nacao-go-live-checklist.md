# Estado da Nação: go-live checklist

## Objetivo

Fechar o Bomba Aberta para entrega real a usuário comum sem inventar superfície nova.

Escopo desta passada:
- checklist de lançamento
- matriz de smoke
- runbook curto da primeira semana
- critério objetivo de "pronto para abrir ao público"

## Checklist executável

### 1) Ambiente
- [ ] `NODE_ENV=production` nos ambientes de produção e preview real
- [ ] build limpo em máquina de integração
- [ ] smoke local roda com `npm run test:smoke`
- [ ] observabilidade de lançamento disponível em `/api/admin/ops/export`

### 2) Secrets
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` apenas no backend/admin
- [ ] segredos de upload/telemetria válidos em produção
- [ ] nenhuma chave sensível exposta ao cliente

### 3) Supabase migrations
- [ ] migrations aplicadas em ordem
- [ ] schema reconciliado com runtime
- [ ] drift check passa
- [ ] tabelas críticas presentes:
  - [ ] `operational_events`
  - [ ] `collector_trust`
  - [ ] `sys_config`
  - [ ] `beta_feedback_submissions`
  - [ ] `audit_station_groups`
  - [ ] `audit_daily_station_prices`
  - [ ] `audit_daily_city_prices`
  - [ ] `price_report_audit_events`
- [ ] colunas esperadas em `price_reports` ativas, incluindo `observed_at`

### 4) Seed mínimo
- [ ] ao menos uma cidade de teste com estações reais
- [ ] um posto com preço recente
- [ ] um posto sem preço recente
- [ ] uma faixa com fila local para testar retorno
- [ ] um cenário de moderação/rejeição válido

### 5) Storage / buckets
- [ ] bucket de foto ativo
- [ ] upload de imagem aceito em mobile e desktop
- [ ] fallback para foto falhada existe
- [ ] política de leitura/escrita não quebra o primeiro envio

### 6) Domínio
- [ ] domínio principal resolve para produção
- [ ] preview real isolado de produção
- [ ] rotas públicas carregam sem login
- [ ] `/admin` continua protegido

### 7) Robots / indexação
- [ ] `robots.txt` não bloqueia rotas públicas
- [ ] páginas públicas importantes indexáveis
- [ ] `/admin` e superfícies internas não indexáveis
- [ ] canonical/metadata consistentes

### 8) Beta / admin
- [ ] beta gate continua separado da identidade comum
- [ ] cookie de beta persiste quando aplicável
- [ ] admin exige auth forte
- [ ] escrita sensível operacional bloqueada sem auth

### 9) Telemetry
- [ ] funil público registrado
- [ ] eventos de envio registrados
- [ ] eventos de fila/draft registrados
- [ ] eventos de identidade leve registrados
- [ ] eventos operacionais registrados
- [ ] export CSV operacional disponível

### 10) Validação final
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run verify`
- [ ] `npm run test:smoke`

## Smoke matrix

### Automatizado

| Cenário | Ferramenta | Critério |
|---|---|---|
| Desktop básico | Playwright smoke | home abre, busca responde, posto abre |
| Mobile narrow | Playwright smoke | layout não quebra, CTA principal visível |
| PWA install | manual + smoke visual | app instala e reabre com continuidade |
| Offline | Playwright + browser offline | draft/queue persistem, retorno ao hub funciona |
| Envio com foto | Playwright smoke | foto sobe, envio conclui ou entra em fila |
| Retorno ao hub | Playwright smoke | returning-state / active-state aparecem |

### Manual

| Cenário | O que conferir | Sinal de sucesso |
|---|---|---|
| Desktop wide | hierarquia da home, lista, hub | sem compressão visual, CTA principal claro |
| Mobile narrow | topo, hero, hub, enviar | sem duplicação de CTA, leitura rápida |
| Foto falhou | rede fraca / arquivo ruim | feedback claro e recuperação simples |
| Fila pendente | envio offline | fila visível, reenfileirar funciona |
| Posto sem preço recente | leitura de posto | estado vazio não bloqueia ação |

## Runbook da primeira semana

### Dia 0
- confirmar export de launch observability
- verificar taxas de `submission_accepted`, `submission_queue_added` e `submission_failed`
- revisar `identity_prompt_shown` versus `identity_prompt_saved`

### Dia 1 a 3
- acompanhar abandono entre `home_opened` e `station_clicked`
- revisar fila local acima do normal
- checar moderação/rejeição por razão
- confirmar que o primeiro envio continua sem barreira

### Dia 4 a 7
- olhar tempo até aprovação
- identificar rotas com erro recorrente
- checar drift de schema e event names
- ajustar copy ou fallback apenas se a operação mostrar queda real

## Pronto para abrir ao público

O projeto está pronto quando:
- leitura pública funciona sem login
- primeiro envio funciona sem barreira extra
- sessão local permite retorno útil no hub
- admin permanece isolado com auth forte
- schema/runtime não tem drift conhecido
- smoke automatizado e manual passam nos cenários principais
- observabilidade mostra funil, fila, draft, aprovação e prompts de identidade
- não existe quebra nos fluxos críticos em desktop, mobile narrow, PWA e offline

## Leitura operacional curta

1. Se `home_opened` cai, o topo ou a home perdeu tração.
2. Se `station_clicked` sobe mas `submit_opened` não acompanha, o posto virou leitura sem ação.
3. Se `submission_queue_added` sobe acima de `submission_queue_completed`, há problema de rede, foto ou abandono.
4. Se `submission_draft_restored` sobe, o retorno está funcionando.
5. Se `moderation_approved` atrasa, o gargalo está em revisão ou em backlog operacional.

## Relatórios relacionados

- [Observabilidade de go-live](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-observabilidade-go-live.md)
