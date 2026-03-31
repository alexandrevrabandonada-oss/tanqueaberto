# Estado da Nação — Sticky e Overlays

Este documento detalha o refinamento das superfícies fixas, headers e overlays do Bomba Aberta, visando uma experiência de usuário mais limpa, estável e contextual.

## 📈 Resumo das Mudanças

### 1. Header Multi-estágio ("Micro-Sticky")
Implementamos uma transição de 3 estágios para o cabeçalho principal (`TopOrchestrator`):
- **Expandido (Default)**: Marca completa, badges de sistema e seletores em destaque.
- **Sticky (Stage 1 - 120px scroll)**: Colapsa a marca para priorizar ferramentas de busca e filtro.
- **Micro (Stage 2 - 400px scroll)**: Compressão máxima. Remove labels do seletor de densidade (ícones apenas), reduz altura do campo de busca e aumenta a transparência (`bg-black/60`).

### 2. Coordenação de Sobreposições (Mission Coordination)
Resolvemos conflitos visuais entre o `TopOrchestrator` e o `MissionOverlay`:
- **Z-Index Normalizado**: Missão (`z-120`) > Header (`z-110`) > Conteúdo.
- **Offset Contextual**: Se uma missão estiver ativa, o header sticky se posiciona automaticamente em `top-14` (56px) para não cobrir o banner da missão.
- **Redução de Ruído**: O header esconde o chip de cidade quando a missão já provê essa informação.

### 3. Refinamento Visual
- **Transparência e Blur**: Trocamos `bg-black/80` por `bg-black/60` no modo micro e aumentamos o `backdrop-blur-xl` para manter a legibilidade sem "pesar" visualmente.
- **Arredondamento e Sombras**: O header sticky usa `rounded-b-3xl` no estágio 1 para um efeito de "painel flutuante" e torna-se `rounded-b-none` no estágio micro para alinhar-se perfeitamente ao teto.

## 📊 Telemetria de Uso

Adicionamos os seguintes pontos de medição:
- `header_state_change`: Rastreia a transição entre estados (expanded, collapsed, micro).
- `scroll_depth_under_sticky`: Mede quão profundo o usuário rola após o cabeçalho se tornar fixo.
- `interaction_context`: Cliques em postos agora informam se o header estava em `sticky` ou `micro`, permitindo medir a eficácia das ações sob obstrução parcial.

## ✅ Conclusão
O cabeçalho agora "respira" conforme o usuário interage com a lista. Em scrolling profundo, a interface recua para segundo plano (modo micro), deixando o foco total nos dados dos postos, mas mantendo as ferramentas de busca a apenas um toque de distância.
