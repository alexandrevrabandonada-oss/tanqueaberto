# Estado da Nação: observabilidade go-live

## Resumo executivo

A base de observabilidade para lançamento ficou pronta para uso operacional sem mexer em layout.

O que entrou nesta passada:
- uma leitura de funil mais clara por superfície e por evento
- export CSV para conversão, erro, fila, restore de draft, latência de aprovação e prompts de identidade leve
- padronização dos eventos legados de sucesso para `submission_accepted`
- guardrail automático de drift de schema para bloquear retorno de nomes antigos
- guia curto de leitura operacional para plantão

## Funil mapeado

### Home
- `home_opened`
- `home_search_used`
- `station_clicked`

### Posto
- `station_opened`
- `station_action_click`
- `camera_opened_from_station`

### Enviar
- `submit_opened`
- `submission_started`
- `submission_draft_restored`
- `submission_queue_added`
- `submission_queue_completed`
- `submission_accepted`
- `submission_failed`

### Moderação
- `moderation_approved`
- `moderation_rejected`
- `moderated` no `price_report_audit_events`

### Hub
- `hub_opened`
- `hub_action_clicked`
- `hub_conversion_success`
- `hub_mission_resumed`

### Identidade leve
- `identity_prompt_shown`
- `identity_prompt_saved`
- `identity_prompt_dismissed`

## Inventário de eventos

### Telemetry de produto
Origem: `trackProductEvent()` -> `POST /api/telemetry`

Eventos usados no lançamento:
- `home_opened`
- `home_search_used`
- `station_clicked`
- `station_opened`
- `submit_opened`
- `submission_camera_opened`
- `camera_opened_from_station`
- `submission_started`
- `submission_step`
- `submission_draft_restored`
- `submission_photo_reselected`
- `submission_photo_lost`
- `submission_abandoned_before_photo`
- `submission_abandoned_after_photo`
- `submission_retry_clicked`
- `submission_series_continued`
- `submission_queue_added`
- `submission_queue_retried`
- `submission_queue_completed`
- `submission_queue_discarded`
- `submission_queue_recovered_success`
- `submission_queue_item_expired`
- `submission_queue_manual_retry`
- `submission_queue_flush_started`
- `submission_abandoned`
- `submission_failed`
- `submission_accepted`
- `submission_quality_flagged`
- `audit_opened`
- `feedback_opened`
- `beta_feedback_received`
- `route_started`
- `route_station_skipped`
- `route_station_arrived`
- `route_completed`
- `route_abandoned`
- `mission_started`
- `mission_completed`
- `mission_aborted`
- `mission_station_completed`
- `mission_station_skipped`
- `field_quality_warning_shown`
- `external_navigation_opened`
- `return_after_navigation`
- `hub_opened`
- `hub_action_clicked`
- `hub_mission_resumed`
- `hub_pendency_resubmitted`
- `hub_camera_opened`
- `hub_conversion_success`
- `identity_prompt_shown`
- `identity_prompt_saved`
- `identity_prompt_dismissed`
- `first_submission_milestone`
- `first_fold_action`
- `station_page_shared`
- `station_evidence_viewed`

### Operational events
Origem: `recordOperationalEvent()`

Eventos usados no lançamento:
- `submission_blocked`
- `submission_failed`
- `upload_failed`
- `upload_rejected_missing`
- `upload_rejected_size`
- `upload_rejected_type`
- `submission_accepted`
- `submission_reviewed`
- `moderation_approved`
- `moderation_rejected`
- `moderation_failed`
- `auth_failed`
- `auth_success`
- `auth_logout`
- `station_curation_failed`
- `station_curation_applied`
- `submission_queue_added`
- `submission_queue_completed`
- `submission_queue_discarded`
- `submission_queue_retried`
- `submission_queue_manual_retry`
- `submission_queue_item_expired`
- `submission_queue_flush_started`
- `telemetry_event`
- `report_cycle_submitted`
- `report_cycle_moderated`
- `report_cycle_visible`

### Audit trail
- `price_report_audit_events.created`
- `price_report_audit_events.moderated`
- `price_report_audit_events.revised`
- `price_report_audit_events.exported`

## Consultas e painéis

### Export CSV já disponível
Endpoint:
- `/api/admin/ops/export`

Kinds novos para leitura de lançamento:
- `launch-funnel`
- `launch-surface`
- `launch-errors`
- `launch-queue`
- `launch-drafts`
- `launch-approval`
- `launch-identity`

Kinds já existentes e úteis:
- `events`
- `funnel`
- `ops`
- `invites`
- `readiness`
- `gaps`
- `feedback`

### Leituras recomendadas por pergunta
- Conversão por superfície: `launch-surface`
- Erro por rota: `launch-errors`
- Taxa de fila local: `launch-queue`
- Restore de draft: `launch-drafts`
- Tempo até aprovação: `launch-approval`
- Taxa de prompts de identidade leve: `launch-identity`

## Drift check automatizado

Script criado:
- [scripts/check-schema-drift.cjs](C:/Projetos/Tanque%20Aberto/scripts/check-schema-drift.cjs)

O que ele faz:
- valida se as migrations ainda contêm os nomes canônicos esperados
- bloqueia reintrodução de nomes legados como `station_groups`, `submission_success` e `price_report_submitted`
- ignora o próprio arquivo de drift check para não se acusar sozinho

Integração:
- `npm run check:drift`
- `npm run verify` agora roda drift check no final

## Guia curto de leitura operacional

1. Se `home_opened` cai e `home_search_used` sobe, o usuário está entrando mas não encontra posto útil.
2. Se `station_clicked` é alto e `submit_opened` é baixo, a página do posto está virando leitura, não ação.
3. Se `submission_queue_added` cresce muito acima de `submission_queue_completed`, o problema é rede, foto ou abandono no meio do envio.
4. Se `submission_draft_restored` cresce e `submission_queue_completed` não acompanha, o retorno está funcionando mas a reconciliação não fecha.
5. Se `moderation_approved` demora, olhe `launch-approval` e o backlog de `pending`.
6. Se `identity_prompt_shown` é alto e `identity_prompt_saved` é baixo, o convite leve está cedo demais ou pouco convincente.
7. Se `submission_reviewed` cresce, o antiabuso está ativo e precisa separar duplicado provável de recência legítima.

## Validação

Executado com sucesso:
- `npm run typecheck`
- `npm run build`
- `npm run verify`
- `npm run check:drift`

## Dif focado

Arquivos principais desta passada:
- [app/admin/ops/export/route.ts](C:/Projetos/Tanque%20Aberto/app/admin/ops/export/route.ts)
- [lib/ops/launch-observability.ts](C:/Projetos/Tanque%20Aberto/lib/ops/launch-observability.ts)
- [lib/ops/alerts.ts](C:/Projetos/Tanque%20Aberto/lib/ops/alerts.ts)
- [lib/ops/beta-synthesis.ts](C:/Projetos/Tanque%20Aberto/lib/ops/beta-synthesis.ts)
- [scripts/check-schema-drift.cjs](C:/Projetos/Tanque%20Aberto/scripts/check-schema-drift.cjs)
- [scripts/check-schema-drift.ts](C:/Projetos/Tanque%20Aberto/scripts/check-schema-drift.ts)
- [package.json](C:/Projetos/Tanque%20Aberto/package.json)
