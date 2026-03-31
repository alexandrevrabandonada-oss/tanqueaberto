# Estado da Nação: rotina operacional territorial

## Diagnóstico curto
Os painéis territoriais já mostravam cobertura, impacto e histórico, mas ainda exigiam troca manual de tela para virar ação. A rotina operacional precisava de um próximo passo explícito por território, com marcação de estado para mutirão, acompanhamento e encerramento temporário.

## O que foi ligado
- [app/admin/ops/cobertura-territorial/page.tsx](C:/Projetos/Tanque%20Aberto/app/admin/ops/cobertura-territorial/page.tsx)
- [app/admin/ops/impacto-semeadura-territorial/page.tsx](C:/Projetos/Tanque%20Aberto/app/admin/ops/impacto-semeadura-territorial/page.tsx)
- [app/admin/ops/historico-cobertura-territorial/page.tsx](C:/Projetos/Tanque%20Aberto/app/admin/ops/historico-cobertura-territorial/page.tsx)
- [app/admin/ops/qualidade/page.tsx](C:/Projetos/Tanque%20Aberto/app/admin/ops/qualidade/page.tsx)
- [app/admin/ops/station-editors/page.tsx](C:/Projetos/Tanque%20Aberto/app/admin/ops/station-editors/page.tsx)
- [app/postos/sem-atualizacao/page.tsx](C:/Projetos/Tanque%20Aberto/app/postos/sem-atualizacao/page.tsx)
- [components/admin/ops/territory-workflow-controls.tsx](C:/Projetos/Tanque%20Aberto/components/admin/ops/territory-workflow-controls.tsx)
- [lib/ops/territory-workflow.ts](C:/Projetos/Tanque%20Aberto/lib/ops/territory-workflow.ts)
- [app/admin/actions.ts](C:/Projetos/Tanque%20Aberto/app/admin/actions.ts)
- [supabase/migrations/20260331_025_territory_workflow_states.sql](C:/Projetos/Tanque%20Aberto/supabase/migrations/20260331_025_territory_workflow_states.sql)

## Antes / Depois
- Antes: cobertura, impacto e histórico eram painéis de leitura, mas não deixavam claro o próximo passo da operação.
- Depois: cada superfície territorial passa a mostrar um bloco de "próxima ação recomendada" com marcação do território.
- Antes: o estado operacional do território era implícito.
- Depois: o território pode ser marcado como `em mutirão`, `em acompanhamento` ou `concluído por enquanto`.
- Antes: o contexto de cidade e bairro ficava concentrado só nos filtros.
- Depois: o contexto continua na trilha e volta como parâmetro no retorno da ação.

## Resultado prático
- Cobertura territorial agora prioriza a próxima ação do território mais quente.
- O histórico persistido também oferece uma marca operacional direta para mutirão.
- O painel de cobertura e a página de histórico ficaram mais úteis para operação semanal, sem virar dashboard bonito.

## Validação
- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou

## Nota
O teto de shared JS global não mudou nesta passada. A mudança foi de fluxo operacional e controle territorial, não de arquitetura de runtime.