# Estado da Nação — Quick Actions Claras e Seguras

## Objetivos Alcançados
Refinamos a camada de ação imediata do Bomba Aberta para garantir velocidade com segurança operacional. O foco foi transformar toques ambíguos em ações determinísticas e ergonomicamente superiores.

## 1. Padronização de Design (QuickAction UI)
Criamos um sistema atômico de ações rápidas:
- **`QuickActionButton`**: Altura mínima de 56px (h-14) no modo rua, garantindo conformidade com a zona de alcance do polegar.
- **`QuickActionGroup`**: Grade persistente de 3 colunas que organiza a hierarquia (Câmera > Navegar > Detalhes).
- **Feedback Tátil**: Estados visuais de "active" e "scale" para confirmar o toque fisicamente.

## 2. Superfícies Atualizadas
- **Cards de Posto**: Botões de ação agora ocupam toda a largura no modo rua, eliminando o erro de toque lateral.
- **Mapa (Bottom Sheet)**: Substituímos o layout de botões empilhados por uma grade de ação rápida, reduzindo o deslocamento do polegar.
- **Acesso Rápido (Home)**: Favoritos e recentes agora usam cards horizontais de alta densidade tátil.

## 3. Telemetria de Precisão
- **`quick_action_misclick`**: Agora rastreamos quando o usuário toca no container de ação mas não atinge o botão. Isso nos permite identificar áreas onde o espaçamento ainda é insuficiente.
- **Ação Determinística**: Rótulos curtos em Caps Lock ("CÂMERA", "CAMINHO", "DETALHES") melhoram a legibilidade sob luz solar direta.

## 4. Segurança no Favorito
- Aumentamos a zona de toque do ícone de favorito (Star) de 16px para 40px (p-3), mantendo o ícone visualmente discreto mas fisicamente acessível.

---
*Relatório focado em ergonomia operacional e eficiência de campo.*
