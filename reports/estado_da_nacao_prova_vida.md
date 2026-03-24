# Estado da Nação — Prova de Vida do Recorte

## Visão Geral
Reforçamos a "prova de vida" das operações de campo no **Bomba Aberta**, transformando dados brutos de atividade em sinais visuais de confiança para os coletores. O objetivo é eliminar o "vácuo operacional" e mostrar que cada ação contribui para um esforço coletivo real.

## Sinais de Atividade Implementados
- **Pulso de Recorrência**: Identificação de postos com múltiplas colaborações, sinalizando confiança e validação cruzada.
- **Rastro de Atividade**: Exibição do último posto "tocado" e da última missão concluída no recorte.
- **Densidade de Colaboração**: Métrica de cobertura (postos tocados vs. total de postos) para incentivar a exploração de lacunas.

## Estados de Saúde do Recorte
Implementamos uma lógica de saúde baseada em atividade recente e densidade:
- **Forte (Verde)**: Alta atividade e boa cobertura. Foco em manutenção.
- **Médio (Amarelo)**: Atividade presente, mas com lacunas. Foco em expansão.
- **Fraco (Cinza/Alerta)**: Baixa atividade recente. Foco em "Quebrar o Silêncio Territorial".

## Impacto no Hub
O coletor agora vê exatamente onde a última ação ocorreu e qual o estado geral da sua área de atuação, recebendo incentivos contextuais para agir onde é mais necessário.

---
*Relatório gerado automaticamente após a implementação do sistema de reforço de prova de vida.*
