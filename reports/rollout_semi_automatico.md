# Estado da Nação — Rollout Territorial Semi-Automático

## Resumo Operacional
O sistema de rollout territorial do Bomba Aberta evoluiu de um modelo puramente manual para um motor de recomendação inteligente (semi-automático). Agora, o sistema analisa proativamente sinais de atividade e cobertura para sugerir promoções ou recuos, mantendo o time de operações no controle final da decisão.

## O Que Mudou
1. **Motor de Recomendação (`lib/ops/rollout-engine.ts`)**:
   - Analisa métricas de cobertura (CCT), volume de envios e inatividade.
   - Gera sugestões de `promote`, `demote`, `monitor` ou `maintain`.
   - Utiliza heurísticas calibradas para o estágio beta atual.

2. **Centro de Comando (`app/admin/command-center/page.tsx`)**:
   - Interface unificada para visualização de alertas, recomendações e estado do beta.
   - Widget de Recomendações: Permite aceitar ou rejeitar sugestões com um clique, solicitando justificativa.
   - Integração de Kill Switches e Pulso de Saúde do Sistema.

3. **Ciclo de Auditoria e Feedback**:
   - Cada decisão (aceite/rejeição) é registrada em `territorial_rollout_logs`.
   - Disparo de eventos operacionais para rastreabilidade total.

## Sinais Analisados
- **Cobertura Territorial**: % de postos tocados vs total mapeado.
- **Volume de Envios**: Total de tentativas recentes para garantir densidade.
- **Inatividade (Regressão)**: Dias desde o último envio aprovado.
- **Engajamento**: Número de colaboradores ativos no recorte.

## Próximos Passos Sugeridos
- **Automação Total (Opcional)**: Habilitar execução automática para recuos (`demote`) em caso de inatividade crítica prolongada.
- **Ajuste de Heurísticas**: Calibrar os limiares de promoção conforme o beta se expande para capitais.
- **Notificações Ops**: Integrar alertas de recomendação crítica via webhook (ex: Discord/Slack).

---
*Gerado por Antigravity em 24/03/2026*
