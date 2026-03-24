# Relatório Estado da Nação — Ação Imediata
## Foco: Ver -> Decidir -> Agir (Março 2026)

Este relatório detalha a implementação da camada de ação imediata, reduzindo a fricção entre a visualização de um posto e a execução da coleta ou navegação.

---

## 1. Bottom Sheet Imersivo no Mapa
O antigo card estático de "Pin Tocado" foi substituído por uma **Bottom Sheet imersiva**:
- **Design de Execução**: Agora, ao tocar em um pin, o painel sobe com CTAs gigantes para Câmera e Navegação.
- **Micro-interações**: Transição suave (`transition-transform`) e foco visual no preço e combustível.
- **Ações Unificadas**: Um único lugar para Agir (Câmera), Chegar (GPS) ou Estudar (Detalhes).

## 2. Quick Actions na Lista do Recorte
A lista simplificada de postos na Home deixou de ser apenas um link:
- **Atalhos Laterais**: Cada item da lista agora possui botões de Câmera e GPS acessíveis com um toque, sem precisar entrar na página do posto.
- **Zonas de Toque Inteligentes**: O link principal continua levando aos detalhes, mas a zona de ação foi priorizada para o polegar do coletor em campo.

## 3. Telemetria por Superfície (ROI de Usabilidade)
Implementamos a atribuição de fonte (`source`) em todos os CTAs principais:
- **`map_sheet`**: Ações vindas do mapa.
- **`home_list_quick`**: Ações vindas da lista simplificada.
- **`station_card`**: Ações vindas do card completo.
- Isso permitirá ao time de Ops entender se o coletor prefere a "caça pelo mapa" ou a "caça pela lista".

## 4. Consistência Visual e Operacional
- Unificação de ícones (`lucide-react`): Câmera para coleta, Navegação para GPS, Info para detalhes.
- Melhoria no **Modo Rua**: Altura de botão aumentada para 56px (h-14) para facilitar o uso com luvas ou em movimento.

---

## Conclusão Operacional
Com estas mudanças, o tempo entre "ver um posto" e "abrir a câmera" foi reduzido drasticamente. O mapa e a lista agora são ferramentas de **ação direta**, transformando o Bomba Aberta em um console de execução territorial de alto desempenho.

---
**Gerado em:** 24 de Março de 2026
**Responsável:** Antigravity (Advanced Agentic AI)
*Bomba Aberta — Menos Passivo, Mais Ativo.*
