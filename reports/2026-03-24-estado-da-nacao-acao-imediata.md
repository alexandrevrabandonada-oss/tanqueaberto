# Estado da Nação — Ação Imediata 2.0

## Objetivos Alcançados
Reduzimos a carga cognitiva do coletor ao interagir com o app em ambiente de rua, tornando os gestos de coleta e navegação instintivos.

## 1. Verbos de Ação Pura
Substituímos ícones genéricos e labels longos por verbos de comando direto:
- **"FOTO"**: Substitui "Câmera" ou "Abrir câmera". É o CTA principal, focado no envio.
- **"ROTA"**: Substitui "Navegar" ou "Caminho". Focado em deslocamento.
- **"VER"**: Substitui "Visualizar" ou "Detalhes". Focado em consulta profunda.

## 2. Unificação de Interface (Mapa & Lista)
- A lista de postos na Home agora utiliza exatamente os mesmos componentes de ação do Mapa.
- Isso garante que a memória muscular do usuário funcione da mesma forma em qualquer superfície do app.
- feedback visual de toque (haptic-like scaling + brightness) foi intensificado para confirmar a ação mesmo sob luz solar forte.

## 3. Telemetria de Precisão
- Implementamos o evento `quick_action_executed` para rastrear a origem do clique (mapa vs lista) e o tipo de ação.
- Agora podemos medir qual superfície é mais eficiente para converter o usuário em um envio de preço.

---
*Relatório focado em instinto, velocidade e redução de misclick.*
