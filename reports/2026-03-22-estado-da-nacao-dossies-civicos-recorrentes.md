# Estado da Nação - Dossiês cívicos recorrentes

Data: 2026-03-22

## O que foi automatizado
- Camada de recorrência para dossiês cívicos com persistência em `audit_report_runs`.
- Histórico persistente de alertas em `audit_alert_history`.
- Agrupamento inicial para recortes territoriais com `audit_station_groups` e `audit_station_group_members`.
- Página pública de comparação entre cidades em `/auditoria/comparar`.
- Página pública de dossiês recorrentes em `/auditoria/relatorios`.
- Script operacional `npm run audit:dossiers` para gerar rodada recorrente e, opcionalmente, salvar relatório em `reports/`.
- Metodologia pública atualizada para explicar relatórios recorrentes, comparação entre cidades e alertas persistidos.

## O que permanece provisório
- A geração recorrente ainda não está agendada em cron real.
- Os grupos territoriais existem no schema, mas a curadoria editorial dos corredores/bairros ainda depende de operação manual.
- O histórico persistido de alertas precisa de massa real para ganhar relevância estatística.
- Os dossiês em PDF seguem institucionais, mas simples; ainda podem ganhar uma camada editorial mais forte.
- O refresh analítico continua dependente da rotina manual `npm run audit:refresh`.

## Riscos metodológicos remanescentes
- Comparações com pouca cobertura podem superestimar diferenças entre cidades.
- Alertas persistidos devem continuar sendo lidos como indícios, não como prova automática.
- Recortes territoriais pequenos podem ter variância alta e exigir leitura cautelosa.
- Dossiês recorrentes precisam de histórico acumulado para evitar conclusões frágeis.

## Limitações atuais da base
- Cobertura desigual entre cidades e combustíveis.
- Recortes por corredor/região ainda pouco preenchidos.
- Histórico de alertas ainda inicial.
- A comparação pública tende a ser mais estável em gasolina comum do que em combustíveis com menos observações.

## Próximos passos recomendados
- Agendar `npm run audit:refresh` e `npm run audit:dossiers` em rotina diária e semanal.
- Criar primeira curadoria editorial dos grupos territoriais mais relevantes.
- Evoluir os PDFs para um layout mais próximo de dossiê institucional.
- Adicionar uma visão pública de corredor/região quando a base estiver mais densa.
- Expandir a memória de alertas com mais rodadas para melhorar leitura temporal.
