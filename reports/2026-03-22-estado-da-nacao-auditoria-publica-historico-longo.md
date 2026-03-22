# Estado da Nação - Auditoria Pública e Histórico Longo

Data: 2026-03-22

## O que foi implementado
- Nova camada pública em `/auditoria` com panorama regional, série diária, alertas e cobertura por município.
- Rotas por cidade em `/auditoria/cidade/[slug]` e por posto em `/auditoria/posto/[id]`.
- Página pública de metodologia em `/auditoria/metodologia`.
- Exportação básica em CSV e PDF via `/auditoria/export`.
- Camada de apoio para histórico em `lib/audit/*` com séries, alertas, resumos e export helpers.
- Evolução do schema de `price_reports` para trilha auditável com `observed_at`, `submitted_at`, `approved_at`, `rejected_at`, `moderated_by`, `moderation_reason`, `source_kind`, `photo_hash` e `version`.
- Tabela de eventos `price_report_audit_events` para registrar criação e moderação.

## O que ainda está provisório
- A série histórica ainda é calculada no servidor a partir dos reports aprovados; não há materialized view/job de agregação dedicado.
- Os alertas são heurísticos e devem ser tratados como indícios, não como prova.
- O PDF é funcional, mas simples. Ainda não há identidade editorial refinada nem gráficos avançados.
- A página pública ainda prioriza gasolina comum no filtro inicial.

## Riscos metodológicos
- Janela pequena pode distorcer mediana, variação e alertas.
- Postos com poucas observações podem parecer mais estáveis do que são.
- Mudanças bruscas precisam de leitura contextual; o produto não deve vender acusação automática.

## Limitações atuais da base
- A cobertura varia por cidade e combustível.
- A série longa depende de aprovação dos reports e da densidade de envios da comunidade.
- Não há ainda comparação temporal complexa entre postos vizinhos além dos alertas básicos.

## Próximos passos recomendados
1. Criar views/materialized views para série diária e resumo 7/30/90 dias.
2. Adicionar filtros de combustível também nas telas de posto e cidade.
3. Refinar os alertas com dispersão por município e comparação entre concorrentes.
4. Melhorar o PDF com layout editorial e tabela mais legível.
5. Amarrar exportação e auditoria a relatórios programados para uso cívico.
