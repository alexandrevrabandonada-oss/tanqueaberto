# Estado da Nação — Operação recorrente e ativação

Data: 2026-03-22

## O que foi automatizado de verdade
- Painel interno `/admin/ops` para acompanhar a operação recorrente.
- Rotas de cron para `audit:refresh` e `audit:dossiers` em ambiente Vercel.
- Registro de execuções operacionais em `ops_job_runs`.
- Visão interna de cobertura, prioridade de coleta e grupos territoriais.
- Seed inicial de grupos operacionais com foco em Volta Redonda, Barra Mansa, Resende e recortes próximos.
- Botões manuais para rodar refresh, gerar dossiês e preencher grupos quando necessário.

## O que segue manual
- Aplicação das migrations no Supabase remoto, caso ainda não tenham sido sincronizadas.
- Disparo de cron real fora do ambiente local.
- Curadoria editorial fina dos grupos territoriais.
- Revisão operacional de alertas e cobertura baixa em situações limítrofes.
- Expansão da coleta por cidade, corredor e combustível conforme a base for amadurecendo.

## Onde a cobertura está mais forte
- Cidades com maior densidade de observações recentes.
- Postos com coordenada validada e histórico contínuo.
- Recortes onde já existem grupos territoriais preenchidos e leitura operacional consistente.

## Onde a cobertura está mais fraca
- Cidades e combustíveis com baixa massa recente.
- Postos sem atualização no recorte analisado.
- Grupos territoriais ainda vazios ou com poucos membros.
- Recortes em que o histórico ainda não sustenta leitura comparativa confortável.

## Limitações atuais da operação
- A rotina está preparada, mas depende de cron real e de schema aplicado no banco remoto.
- A cobertura operacional ainda é desigual entre cidades e combustíveis.
- A leitura de prioridade é útil para triagem, não substitui curadoria editorial.
- O seed de grupos é inicial e precisa de revisão territorial contínua.

## Riscos remanescentes
- Executar dossiês e refresh sem o schema operacional aplicado gera falha de leitura nas tabelas novas.
- Cobertura baixa pode parecer estabilidade falsa se for interpretada sem contexto.
- Grupos territoriais mal curados podem concentrar atenção em recortes pouco representativos.

## Próximos passos recomendados
- Aplicar as migrations operacionais no Supabase remoto e validar a tabela `ops_job_runs`.
- Ativar o cron da Vercel para refresh diário e dossiês semanais/mensais.
- Consolidar os primeiros grupos territoriais com revisão editorial.
- Monitorar cobertura por cidade e combustível na rotina do painel interno.
- Usar a prioridade de coleta para aumentar densidade onde a base ainda está cega.
