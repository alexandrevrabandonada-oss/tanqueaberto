# Estado da Nação — Modo Foco da Primeira Dobra

## Objetivos Alcançados
Eliminamos a competição por atenção na Home, garantindo uma hierarquia visual adaptativa que responde ao estado real do usuário e do território.

## 1. Adaptive Focus Hero
Implementamos um cabeçalho inteligente que detecta o contexto de uso:
- **Sticky Mini-Header**: Ao rolar a página ou ativar uma missão, o Hero se contrai em uma barra minimalista e persistente.
- **Foco Operacional**: Quando há uma missão ativa, suprimimos os filtros secundários para dar prioridade total ao card de navegação e busca rápida de postos.
- **Backdrop Blur & Transition**: Adicionamos transições suaves e efeito de vidro para manter a legibilidade acima do mapa.

## 2. Orquestração de Ruído
Refinamos o sistema de superfícies para evitar o empilhamento excessivo:
- **Supressão Contextual**: Durante missões, apenas alertas críticos e cards de progresso são exibidos no topo.
- **Hierarquia Estrita**: Novo usuário recebe instrução (Hero Full); usuário recorrente recebe ferramenta (Hero Compacto).

## 3. Conversão de Primeira Dobra
Nova camada de telemetria `first_fold_action` operando em:
- Início de missões (lista e botões críticos).
- Uso de busca e filtros rápidos.
- Troca de recorte territorial.

## Próximos Passos Sugeridos
- Monitorar a taxa de "Scroll para Filtros" vs "Ação Imediata".
- Testar variantes do Sticky Header em dispositivos com telas muito pequenas.

---
*Relatório focado em usabilidade de campo e eficiência operacional.*
