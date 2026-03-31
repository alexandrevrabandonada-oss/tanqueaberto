# Estado da Nação: acompanhamento fino da fila territorial

## Resumo
A fila territorial ganhou um segundo nível de acompanhamento humano, mas ainda leve:

- responsável nominal opcional além do papel
- nota curta por território
- última atualização de acompanhamento
- bloqueio curto com motivo simples

Isso mantém a coordenação territorial prática para mutirão e curadoria sem virar CRM ou sistema de tickets.

## O que entrou
- [lib/ops/territory-workflow.ts](C:/Projetos/Tanque%20Aberto/lib/ops/territory-workflow.ts)
- [components/admin/ops/territory-workflow-controls.tsx](C:/Projetos/Tanque%20Aberto/components/admin/ops/territory-workflow-controls.tsx)
- [app/admin/actions.ts](C:/Projetos/Tanque%20Aberto/app/admin/actions.ts)
- [app/admin/ops/fila-territorial/page.tsx](C:/Projetos/Tanque%20Aberto/app/admin/ops/fila-territorial/page.tsx)
- [supabase/migrations/20260331_027_territory_workflow_follow_up.sql](C:/Projetos/Tanque%20Aberto/supabase/migrations/20260331_027_territory_workflow_follow_up.sql)

## O que agora fica visível
- nome nominal do dono, quando existir
- papel do responsável, sempre que houver
- nota curta operacional
- bloqueio curto: semeadura, curadoria, editor ou sem prioridade agora
- última atualização de acompanhamento

## Antes e depois
Antes:

- o território tinha dono e prazo, mas faltava um contexto humano mínimo
- bloquear ou segurar um território não tinha leitura padronizada
- a fila era operacional, porém ainda muito seca

Depois:

- a fila do dia mostra quem está no território, o que está travando e quando foi o último acompanhamento
- o bloco curto deixa claro se a próxima peça esperada é semeadura, curadoria ou editor
- a operação continua simples e não virou sistema de tickets

## Leitura operacional
- `Responsável` continua sendo o papel.
- `Nome do dono` é opcional e serve para coordenação humana.
- `Bloqueio curto` é para travas leves, não para abrir tarefa longa.
- `Última atualização` permite ver se o território ficou parado demais.

## Validação
- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou

## Números
- `/admin/ops/fila-territorial` continua em `175 B` de route size e `106 kB` de First Load JS
- `First Load JS shared by all` continua em `103 kB`

## Observação
Essa passada não adiciona fila de tickets. Ela só coloca um nível mínimo de contexto humano para a coordenação territorial seguir prática e rápida.