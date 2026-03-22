# Estado da Nação — Endurecimento analítico da auditoria

Data: 2026-03-22

## O que saiu do modo provisório
- A série histórica pública passou a usar materialized views em `supabase/migrations/20260322_006_audit_analytics.sql`.
- O app agora expõe cobertura, confiança e tendência na camada pública de auditoria.
- O PDF de exportação foi refeito para cara de dossiê cívico: cabeçalho, resumo, gráfico, alertas, metodologia e observações recentes.
- A exportação CSV do panorama agora inclui cobertura, confiança, tendência e variação.
- Foi criado o refresh operacional `npm run audit:refresh` para atualizar as views analíticas.

## O que foi implementado
- Série diária por posto e por cidade a partir de agregados do banco.
- Resumos 7/30/90 dias com cobertura, confiança e tendência.
- Alertas melhores para alta brusca, queda brusca, movimento sincronizado, baixa cobertura e posto sem atualização recente.
- Filtros públicos de combustível e janela mantidos na auditoria.
- Metodologia pública consolidada em texto único reutilizável.

## O que ainda depende de mais massa de dados
- Os alertas ficam mais úteis conforme a janela histórica cresce.
- Cidades com pouca cobertura ainda produzem leitura cautelosa.
- O dossiê por posto/cidade melhora à medida que entram mais observações aprovadas.

## Riscos metodológicos remanescentes
- A leitura continua sendo de monitoramento popular e indícios, não de prova automática.
- Cobertura baixa pode sugerir estabilidade falsa.
- Médias e medianas diárias dependem da densidade das observações válidas.
- Refresh das materialized views precisa entrar em rotina operacional para não deixar a base analítica envelhecida.

## Próximos passos recomendados
- Agendar `npm run audit:refresh` em job diário ou semanal.
- Expandir os dossiês programáveis para exportar pacotes por cidade, combustível e período.
- Adicionar uma visão comparativa entre cidades no observatório.
- Incluir um histórico resumido de alertas já vistos para facilitar apuração jornalística.
