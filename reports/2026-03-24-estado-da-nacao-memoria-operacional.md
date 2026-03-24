# Estado da Nação — Memória Curta Operacional

## Objetivos Alcançados
Implementamos uma camada de inteligência operacional que reconhece o uso recorrente e minimiza a fricção de retorno para usuários ativos. O app agora "lembra" do contexto imediato sem o peso de um sistema complexo de favoritos.

## 1. Hub de Memória (useOperationalMemory)
Criamos um motor de persistência leve que rastreia:
- **Postos Recentes**: Os últimos 6 postos interagidos.
- **Recortes Recentes**: Cidades e corredores explorados recentemente.
- **Expiração Inteligente**: Dados de "memória curta" duram 48h, limpando o ruído automaticamente.

## 2. Interface de Continuidade
- **Operational Memory Bar**: Uma nova barra horizontal na home que oferece atalhos de um toque para os últimos postos e cidades vistos.
- **Shortcuts do Dia**: No Hub de Retenção, agora existe o card "Retomar onde parou", que sugere o último posto visitado se ele ainda não teve envio hoje.

## 3. Telemetria de Eficiência
- Implementamos o evento `memory_shortcut_click` para medir quanto tempo os usuários economizam ao usar os atalhos em vez da busca manual.

## Impacto na Experiência
- Menos digitação, mais ação.
- Sensação de um app personalizado e "vivo".
- Aceleração do ciclo de coleta (Home -> Posto -> Envio).

---
*Bomba Aberta agora tem memória curta para ações rápidas.*
