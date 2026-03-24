# Estado da Nação — Meu Hub 4.0 (Agenda de Rua)

**Data:** 2026-03-24
**Status:** Produção / Lançado
**Versão:** 4.0.0 "Operacional"

## Visão Geral
O "Meu Hub" deixou de ser apenas uma tela de ativação para se tornar a **Agenda Operacional** do coletor. Introduzimos uma lógica de priorização dinâmica que responde ao contexto imediato do usuário e às necessidades do território.

## Inovações Técnicas

### 1. Agenda Operacional (`HubOperatingAgenda`)
Substituímos os blocos estáticos por um motor de decisão que orquestra cinco níveis de prioridade:
1.  **CRITICAL**: Erros de envio e pendências de fotos (Bloqueia o fluxo).
2.  **MISSION**: Continuidade de Missões de Rua ativas (Foco em progressão).
3.  **PROXIMITY**: Identificação de lacunas de preço a < 3km (Ação de oportunidade).
4.  **IMPACT**: Feedback em tempo real de envios aprovados (Motivação).
5.  **EXPLORE**: Direcionamento para o mapa quando não há ações imediatas.

### 2. Inteligência de Proximidade
Integramos o hook `useGeolocation` diretamente no Hub para disparar a ação "ABRIR CÂMERA" assim que o coletor estiver perto de um posto que precisa de atualização, reduzindo o tempo entre a intenção e a execução.

### 3. Consolidação de UI
Eliminamos redundâncias (Retomada vs Smart Actions) em favor de uma lista única, limpa e de alta densidade visual, seguindo o padrão **Premium Vertical** do VR Abandonada.

## Métricas Instrumentadas
- `hub_opened`: Frequência de retorno ao centro de comando.
- `hub_agenda_action_clicked`: Taxa de conversão por tipo de prioridade (Critical, Mission, Proximity, etc).
- `geolocation_granted` (no Hub): Disponibilidade de dados de proximidade para a agenda.

## Conclusão
O Meu Hub 4.0 reduz a sensação de "recomeço" a cada abertura de app, dando ao coletor um caminho claro de "O que fazer agora", aumentando a eficiência da coleta e a retenção diária.

---
*Assinado: Antigravity — Engenharia de Ativação Territorial*
