# Estado da Nação — Densidade Mobile Final

## Objetivos Alcançados
Concluímos uma passada profunda de densidade visual, garantindo que o Bomba Aberta seja um produto extremamente eficiente em telas pequenas. Removemos o peso visual desnecessário, priorizando a área útil e a velocidade de scroll.

## 1. Cards e Espaçamento Operacional
- **Compactação Universal**: Reduzimos os paddings dos `SectionCard` e `StationCard` de 20px para 16px (p-4) em mobile, ganhando aproximadamente 15% de área útil vertical na lista.
- **Hierarquia de Texto**: Ajustamos os tamanhos de fonte de labels secundárias para 11px, mantendo a legibilidade e reduzindo a altura dos blocos de texto.

## 2. Filtros e Navegação
- **Horizontal Chips**: Os filtros de cidade e chips de categoria agora usam scroll horizontal (`no-scrollbar`), eliminando o empilhamento vertical que "empurrava" o conteúdo útil para fora da primeira dobra.
- **Safe Area Inset**: Implementamos suporte nativo para `env(safe-area-inset-bottom)`, garantindo que a navegação não seja obstruída em iPhones com notch ou Androids com barras de sistema.

## 3. Experiência de Retenção (Hub)
- **Lean Hub**: Refatoramos as superfícies do `RetentionHub` para usar layouts lineares e gaps reduzidos. O resultado é um Hub que parece informativo, não sobrecarregado.

## 4. Observabilidade de Engajamento
- **Scroll Depth Tracking**: Implementamos telemetria que registra quando o usuário atinge 25%, 50%, 75% e 100% da página, permitindo medir o "Drop-off" visual e ajustar a densidade futuramente com base em dados reais.

---
*Bomba Aberta agora tem o respiro de um produto maduro e a densidade de uma ferramenta de campo.*
