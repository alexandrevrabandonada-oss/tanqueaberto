# Estado da Nação — Release Control por Grupo

## Resumo Executivo
Implementamos o sistema de **Release Control por Grupo Territorial**, transformando o relatório de maturidade (readiness) em uma regra de ativação real do produto. O Bomba Aberta agora prioriza automaticamente áreas "Verdes" (Prontas) e sinaliza visualmente o estado de validação de cada corredor ou cidade.

## Novidades na Camada Beta

### 1. Priorização Inteligente
A home do app agora reorganiza a lista de postos dinamicamente:
- **Áreas Verdes (Ready)**: Sempre no topo, com melhor leitura e confiança.
- **Áreas Amarelas (Validating)**: Marcadas como "Em Validação", indicando que os dados ainda estão sendo estabilizados.
- **Áreas Vermelhas (Limited/Hidden)**: Depriorizadas ou ocultas para evitar ruído durante o beta de rua.

### 2. Sinalização de Maturidade
Adicionamos badges oficiais em toda a interface:
- **"Pronto para Uso"**: Selo de confiança para áreas com cobertura > 70%.
- **"Em Validação"**: Sinaliza que o Street Tester deve focar em coletar para amadurecer o recorte.
- **"Acesso Limitado"**: Indica regiões que ainda não são o foco principal do teste presencial.

### 3. Painel de Rollout Admin
Criamos uma nova ferramenta operacional em `/admin/rollout`:
- Visão comparativa: **Readiness Real** (baseado em dados) vs. **Status de Produto** (override manual).
- Botões de ação rápida para publicar/despublicar grupos.
- Notas de rollout para documentar decisões territoriais.

## Impacto no Beta de Rua
- **Expectativa Alinhada**: O tester sabe onde o app é "autoridade" e onde ele é "colaborador".
- **Foco de Coleta**: Centralização do esforço humano onde o readiness está próximo da linha verde.
- **Segurança Crítica**: Possibilidade de "esconder" instantaneamente recortes com problemas de integridade.

---
**Status: Rollout Ativo.**
**Data: 2026-03-23**
