# Estado da Nação — Home Adaptativa 2.0

## Objetivos Alcançados
Transformamos a Home do Bomba Aberta de uma página estática e competida em uma experiência fluida que se adapta ao momento do coletor e à maturidade do território.

## 1. Orquestração de Superfícies
- **Filtro por Perfil**: O app agora identifica se o usuário é `Iniciante`, `Ativo` ou `Senior`. 
- **Iniciante**: Foco total em Guia de Primeira Visita e ativação rápida. Prompts secundários (PWA, Beta) são ocultados para reduzir ruído.
- **Senior**: Prioridade para o Hub de Retenção e widgets de atividade territorial (`Pulse`).

## 2. Hierarquia Contextual (Primeira Dobra)
- **Modo Missão**: Quando uma missão está ativa, os blocos de "Acesso Rápido" e a "Hero Section" são recolhidos ou simplificados. Isso garante que o topo da tela seja útil para o trabalho de rua sem distrações visuais.
- **Modo Rua**: O botão de Modo Rua ganha precedência total para coletores recorrentes.

## 3. Telemetria de Conversão
- Implementamos o evento `home_block_interacted` para medir quais partes da home estão convertendo melhor para cada perfil de usuário. Isso nos permitirá refinar os pesos da orquestração no futuro.

## 4. Estágio Territorial
- A Home agora exibe distintivos de maturidade do recorte (Forte vs Em Formação) integrados ao seletor de cidades, ajudando o usuário a entender a qualidade do dado que está consumindo.

---
*Relatório focado em foco visual e eficiência de ação.*
