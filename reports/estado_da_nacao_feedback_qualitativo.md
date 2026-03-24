# Estado da Nação — Feedback Qualitativo Integrado

## Resumo Operacional
O Bomba Aberta agora possui uma camada de **telemetria humana** que complementa a telemetria técnica. O sistema captura o "porquê" por trás dos abandonos de missão e picos de fricção no envio de preços, transformando comentários brutos em tags operacionais classificadas automaticamente.

## Arquitetura de Escuta Contextual
- **RouteAssistant**: Quando um coletor "pula" um posto ou "encerra" uma rota, um modal leve solicita o motivo (ex: "Posto fechado", "Muito longe").
- **PriceSubmitForm**: Introduzido um gatilho fixo de ajuda/feedback no fluxo de envio para capturar problemas de UX ou dúvidas sobre o posto/preço.
- **Engine de Triagem**: Os feedbacks são processados pelo servidor e marcados com tags automáticas (`posto_fechado`, `recorte_fraco`, `ux_confusa`) usando detecção de keywords.

## Painel de Síntese (Admin Ops)
- **Widget "Voz da Rua"**: Exibe os 10 feedbacks mais recentes com suas respectivas tags e contextos de tela.
- **Intervenção Rápida**: Permite ao time de Ops identificar se um recuo territorial é necessário devido a problemas de infraestrutura relatados pelos coletores.

## Próximos Passos
- Expandir a categorização automática com LLM se o volume de feedback crescer.
- Notificar moderadores em tempo real para feedbacks marcados como "críticos" (ex: violência ou assédio no posto).
