# Estado da Nação — Loop Envio -> Visibilidade

## Objetivos Alcançados
Fechamos o loop de feedback entre o coletor de rua e o sistema público, eliminando a "caixa-preta" da moderação e expondo gargalos operacionais em tempo real.

## 1. Timeline de Ciclo do Coletor
Substituímos o status estático por uma **Timeline de Ciclo Dinâmica** presente no Histórico e no Meu Hub:
- **Enviado**: Registro exato do momento da submissão.
- **Fila**: Indica que o dado está na fila de moderação (Pipeline).
- **Auditado**: Momento exato da aprovação/rejeição.
- **Mapa**: Confirmação visual de que o preço já está impactando o ranking e o mapa público.

## 2. Monitoramento de Latência (Ops Dashboard)
Introduzimos o **TMC (Tempo Médio de Ciclo)** como métrica de saúde operacional:
- **Painel de Velocidade**: Visualização de P50 (Mediana) e P90 para moderação e propagação de visibilidade.
- **Detector de Gargalos**: Identificação automática de cidades ou recortes onde a moderação está levando mais tempo que o SLA esperado.

## 3. Valor Percebido e Confiança
A integração com o "Meu Hub" agora fornece feedback direto:
- "Seu último envio foi validado e já está ajudando a rede."
- Redução da latência percebida através da transparência de cada etapa.

## 4. Telemetria de Pipeline
Rastreamos agora as transições de estado como eventos de saúde do produto (`report_cycle_*`), permitindo criar alertas de engenharia caso a latência global suba acima do umbral crítico.

---
*Relatório focado em transparência de ciclo e fluidez de dados.*
