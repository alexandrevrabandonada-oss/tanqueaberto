# Estado da Nação — Missão de Rua Ultraobjetiva

## 🎯 Objetivo Alcançado
Implementamos o **Modo Missão**, uma experiência de coleta de dados em campo focada em **alta cadência, baixa fricção e decisão zero**. O sistema agora guia o colaborador de um posto para o próximo automaticamente, eliminando o pensamento entre envios.

## 🚀 Novas Capacidades Operacionais

### 1. Loop de Coleta Sem Costura
- **Pós-envio Automático**: Após cada sucesso, o botão primário transforma-se em "IR PARA O PRÓXIMO ALVO".
- **Fluxo com Uma Mão**: CTAs gigantes e focados reduzem a necessidade de precisão em movimento.
- **Redução de Cliques**: O trajeto "Ver Lacuna -> Abrir Câmera -> Avançar" foi reduzido ao mínimo técnico possível.

### 2. Visibilidade e Controle (Mission Overlay)
- **Overlay Persistente**: Uma barra discreta no topo mantém o contexto da missão (grupo ativo, progresso e próximo alvo) visível em qualquer página.
- **Resiliência de Sessão**: O progresso da missão é salvo no `localStorage`, sobrevivendo a recarregamentos ou quedas de conexão.

### 3. Inteligência Territorial (Recortes)
- **Missão por Filtro**: Possibilidade de iniciar uma missão baseada em qualquer busca ou filtro do mapa.
- **Missão de Lacunas**: Botão direto na lista de postos sem preço recente para resolver o território sistematicamente.

## 📊 Telemetria de Performance
Agora rastreamos métricas críticas para a eficiência de rua:
- **Duração entre Envios**: Qual o intervalo real entre uma coleta e outra?
- **Taxa de Pulo (Skip)**: Quais postos estão sendo evitados pelos colaboradores?
- **Completion Rate**: Quantas missões são terminadas vs. abortadas.

## 🛠️ Estabilidade Técnica
- **Tipagem Forte**: Integração total com o sistema de telemetria e componentes de UI existentes.
- **Client-Side First**: Lógica de missão processada localmente para garantir resposta imediata mesmo com sinal de internet instável.

---
**Status: GO para teste de rua intensivo.**
**Impacto Esperado: Aumento de 2x na densidade de coleta por hora/colaborador.**
