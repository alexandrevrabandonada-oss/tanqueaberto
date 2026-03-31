# Estado da Nação: fila operacional territorial

## Resumo
A rotina territorial saiu do modo apenas informativo e ganhou fila operacional com:

- responsável por território ou ação
- prazo simples
- prioridade do dia
- leitura de mutirão, acompanhamento e conclusão recente

Isso permite usar a cobertura territorial como fila de coordenação, sem virar sistema pesado de tarefas.

## O que entrou
- [lib/ops/territory-workflow.ts](C:/Projetos/Tanque%20Aberto/lib/ops/territory-workflow.ts)
- [components/admin/ops/territory-workflow-controls.tsx](C:/Projetos/Tanque%20Aberto/components/admin/ops/territory-workflow-controls.tsx)
- [app/admin/actions.ts](C:/Projetos/Tanque%20Aberto/app/admin/actions.ts)
- [app/admin/ops/fila-territorial/page.tsx](C:/Projetos/Tanque%20Aberto/app/admin/ops/fila-territorial/page.tsx)
- [app/admin/ops/page.tsx](C:/Projetos/Tanque%20Aberto/app/admin/ops/page.tsx)
- [supabase/migrations/20260331_026_territory_workflow_coordination.sql](C:/Projetos/Tanque%20Aberto/supabase/migrations/20260331_026_territory_workflow_coordination.sql)

## Modelo operacional
Cada território agora pode carregar:

- `responsible_role`
  - `station_editor`
  - `curadoria`
  - `operacao_admin`
- `due_kind`
  - `hoje`
  - `esta_semana`
  - `sem_prazo`
- `due_at`

O fluxo continua simples:

1. marcar o território como `em mutirão`, `em acompanhamento` ou `concluído por enquanto`
2. definir responsável
3. definir prazo curto
4. ler a fila do dia

## Leitura da fila
A tela [fila do dia](C:/Projetos/Tanque%20Aberto/app/admin/ops/fila-territorial/page.tsx) organiza os territórios em:

- prioridades de hoje
- territórios em mutirão
- acompanhamento atrasado
- concluídos recentemente

A ordenação favorece:

- acompanhamento atrasado
- prazo de hoje
- mutirão
- prazo desta semana
- conclusão recente

## Antes e depois
Antes:

- os estados territoriais existiam, mas ficavam mais perto de leitura analítica do que de coordenação
- não havia dono nem prazo explícito
- a operação precisava inferir a próxima ação manualmente

Depois:

- cada território tem dono, prazo e estado
- a fila do dia prioriza o que precisa andar agora
- a cobertura territorial passou a orientar mutirão e acompanhamento com mais clareza

## Validação
- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou

## Números
- `/admin/ops/fila-territorial` ficou com `175 B` de route size e `106 kB` de First Load JS
- `First Load JS shared by all` permaneceu em `103 kB`

## Observação
Essa fila não substitui curadoria nem cobertura territorial. Ela só converte o estado do território em rotina prática de coordenação semanal e diária.