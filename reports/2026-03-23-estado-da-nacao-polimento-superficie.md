# Estado da Nação — Polimento de Superfície e Coerência

Este documento resume as melhorias na camada pública do Bomba Aberta para garantir uma experiência de uso real (beta de rua) mais limpa, hierárquica e óbvia.

## 1. Eliminação de Ruído e CTAs
- **CTA Único por Card**: Removemos a duplicação de "Abrir câmera". Agora, cada card de posto tem uma barra de ação unificada na base, reduzindo a carga cognitiva.
- **Microcopy Direto**: Alteramos labels de botões para serem mais claros sobre o destino (ex: "Ver detalhes" em vez de "Abrir posto").

## 2. Hierarquia Visual e Badges
- **Status Prioritário**: Implementamos uma lógica de precedência para os badges.
    - **Prioridade 1**: Localização em revisão (Alerta crítico).
    - **Prioridade 2**: Status de preço (Recente vs Sem Preço).
    - **Secundário**: O tempo relativo (ex: "Há 2h") foi movido para uma posição de suporte ou subtítulo, limpando o cabeçalho do card.
- **Tipografia Compacta**: Reduzimos o peso visual de nomes de marcas ("Posto" vs nome real) e endereços, usando `line-clamp` para evitar cards excessivamente altos.

## 3. Coerência de Contadores
- **Bloco Unificado**: Os contadores de "No Recorte", "Com Preço", "Falta Atualizar" e "No Ar 24h" foram consolidados em um único grid visual.
- **Sincronia Mapa/Lista**: O rótulo da "Lista do recorte" agora reflete exatamente o que está visível no mapa, eliminando a sensação de dados conflitantes.

## 4. Design Premium e Compactação
- **SectionCard Refinado**: Tencionamos o padding padrão e suavizamos gradientes para um efeito "glassmorphism" mais maduro.
- **Listas Densas**: As listas de exploração e de atualizações recentes ficaram mais compactas, permitindo ver mais itens na primeira dobra da tela.

## Próximos Passos
- Monitorar o engajamento com o botão unificado de câmera.
- Validar se a nova densidade de informação facilita a decisão de qual posto atualizar primeiro.
- Iniciar o beta de rua com a superfície polida.
