# Estado da Nação — Rota de Coleta (Assisted Collection)

## Resumo Executivo
Implementamos o **Modo de Coleta Assistida**, um divisor de águas para a operação de campo do Bomba Aberta. O objetivo é transformar o tester de rua em um agente de densificação guiado por dados, reduzindo o tempo de decisão entre um posto e outro.

## Pilares da Entrega

### 1. Inteligência de Priorização
O algoritmo `getNextPriorityStation` agora pondera:
- **GAPs (Lacunas)**: Postos sem preços recentes para o combustível em foco.
- **Readiness**: Nível de confiança geoespacial e histórico de reports.
- **Contexto**: Cidade ou grupo territorial selecionado.

### 2. Interface de Assistência (`RouteAssistant`)
Um componente resiliente que guia o usuário:
- **Abrir Câmera**: Reduz o fluxo de submissão para 2 cliques.
- **Pular**: Permite que o tester ignore obstáculos no mundo real (ex: trânsito, posto fechado) sem perder o ritmo.

### 3. Persistência de Sessão
A rota sobrevive a recarregamentos, quedas de sinal e fechamento do app, garantindo que o tester não perca seu progresso no meio do trajeto.

## Próximos Passos
- **Monitoramento de Telemetria**: Acompanhar `route_station_skipped` para identificar postos com problemas de acesso ou visibilidade.
- **Expansão para Grupos**: Integrar a lógica de corredores/grupos territoriais (além de cidades) conforme o readiness evoluir.
- **Mapa Vivo Premium**: Usar os dados de rota para premiar testers que completam circuitos de densificação.

---
**Status: Pronto para Teste Presencial / Beta Rua.**
**Data: 2026-03-23**
