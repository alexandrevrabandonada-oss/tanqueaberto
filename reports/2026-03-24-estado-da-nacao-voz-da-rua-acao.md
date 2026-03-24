# Estado da Nação — Voz da Rua com Ação Semi-Automática

## Objetivos Alcançados
Evoluímos a camada de escuta ("Voz da Rua") para uma superfície de comando tático, permitindo que o atrito detectado via feedback seja corrigido com intervenções humanas rápidas e precisas.

## 1. Do Sentimento à Ação Estruturada
Os clusters de feedback não são mais apenas texto. Eles agora geram objetos `SuggestedAction` com tipos e parâmetros operacionais:
- **REVISE_STATION**: Disparado por relatos de ambiguidade ou erro de mapa. Marca o posto para curadoria imediata.
- **HOLD_ROLLOUT**: Detecta "recortes fracos" ou vazios e sugere o retrocesso preventivo (Rollback) do estágio do grupo.
- **ADJUST_RADIUS**: Sugere ajustes técnicos em geofencing quando há relatos recorrentes de erro de GPS/proximidade.
- **NOTIFY_TEAM**: Escala problemas de infraestrutura (câmera, latência) para o time de engenharia.

## 2. Workflow de Aceite (Human-in-the-loop)
Implementamos uma interface de decisão no Painel Ops:
- **Botão EXECUTAR**: Aciona a mudança real no banco de dados (revalida cache, atualiza status de grupos/postos).
- **Botão IGNORAR**: Descarta a sugestão para manter o dashboard limpo, registrando a decisão.
- **Confirmação Explícita**: Garante que nenhuma automação cega altere o estado do produto sem supervisão.

## 3. Telemetria e Fechamento de Loop
Rastreamos o ciclo completo da ação:
- `operational_action_proposed`: Proporção de problemas detectados que geram solução.
- `operational_action_accepted/ignored`: Taxa de confiança do operador no motor de sugestão.
- `operational_action_executed`: Confirmação da intervenção técnica.

## 4. Impacto Operacional
- **Velocidade**: O tempo entre "ler um problema" e "acionar a correção" caiu de minutos para segundos.
- **Precisão**: Ações vêm pré-configuradas com o `stationId` ou `groupSlug` correto, eliminando erros de busca manual no admin.

---
*Relatório focado em agilidade operacional e resiliência assistida.*
