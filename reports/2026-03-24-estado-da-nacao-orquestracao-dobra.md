# Estado da Nação — Orquestração da Primeira Dobra (Phase 25)

## Objetivos Alcançados
Implementamos um sistema de inteligência de interface que organiza os múltiplos banners e avisos que competiam pela percepção do usuário ao abrir o app. Agora, a experiência inicial é limpa, focada e contextual.

## Melhorias Implementadas

### 1. Sistema de Prioridades (Surface Orchestrator)
- **Hierarquia de Importância:** Alertas críticos (como erro de conexão) agora possuem prioridade máxima (`100`), enquanto avisos informativos (como "Beta Fechado") têm prioridade mínima (`20`).
- **Concentração de Foco:** O orquestrador garante que apenas os **dois itens mais importantes** sejam exibidos simultaneamente, evitando o empilhamento excessivo que "empurrava" o mapa para fora da tela.

### 2. Gestão de Contexto
- **Recolhimento Inteligente:** Avisos secundários são exibidos em formato minimizado (collapse), permitindo que o usuário os expanda se desejar, mas mantendo a dobra principal livre.
- **Destaque Dinâmico:** Se o usuário retorna de uma navegação externa, o destaque total vai para o botão "ABRIR CÂMERA", suprimindo orientações de onboarding menos urgentes.

### 3. Novo Card de Instalação (PWA)
- **Integração Nativa:** Adicionamos um card dedicado para incentivar a instalação do app (`beforeinstallprompt`), que entra na fila de orquestração de forma orgânica.
- **Vantagem Clara:** Mensagem focada em velocidade e acesso rápido para o tester de rua.

### 4. Telemetria de Exposição
- **Métricas de Visualização:** Agora rastreamos quais superfícies foram de fato exibidas ao usuário (`surface_orchestrated_view`), permitindo analisar quais alertas estão gerando mais engajamento.

## Resultado Prático
- Home do app muito mais profissional e "calma".
- Redução drástica da poluição visual em aparelhos com telas menores.
- Garantia de que avisos críticos nunca serão escondidos por mensagens de marketing ou onboarding.

---
*Relatório gerado em 24 de Março de 2026. Design com foco no que importa.*
