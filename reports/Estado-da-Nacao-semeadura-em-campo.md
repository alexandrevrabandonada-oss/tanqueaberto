# Estado da Nação: semeadura em campo

## Diagnóstico
O fluxo de semeadura de postos já tinha papel restrito, cadastro leve, edicao leve e leitura territorial. O gargalo restante era operacional: faltava um modo de campo para continuar cadastrando postos em sequencia, sem perder o contexto da cidade/bairro e sem voltar a um painel pesado entre um posto e outro.

## O que mudou
- A leitura territorial virou guia operacional em [app/admin/ops/cobertura-territorial/page.tsx](C:/Projetos/Tanque%20Aberto/app/admin/ops/cobertura-territorial/page.tsx).
- O fluxo de cadastro em [app/postos/cadastrar/page.tsx](C:/Projetos/Tanque%20Aberto/app/postos/cadastrar/page.tsx) passou a aceitar contexto vindo da cobertura territorial.
- O salvamento em [app/postos/cadastrar/actions.ts](C:/Projetos/Tanque%20Aberto/app/postos/cadastrar/actions.ts) preserva cidade, bairro e origem para seguir em campo.
- O formulário em [components/stations/station-seed-form.tsx](C:/Projetos/Tanque%20Aberto/components/stations/station-seed-form.tsx) continua curto, mobile-first e com prevenção de duplicidade.

## Antes / Depois
- Antes: o cadastro de posto novo funcionava, mas não guiava bem quem estava em campo cadastrando varios postos em sequencia.
- Depois: o fluxo mostra resumo curto do salvo, permite `Cadastrar próximo` e volta direto para cobertura ou mapa.
- Antes: a cobertura territorial era uma tela operacional separada.
- Depois: ela virou a base de entrada para semeadura em campo, com links diretos para bairros e cidades com lacunas.
- Antes: a troca de contexto entre postos quebrava o ritmo.
- Depois: o redirect preserva cidade e bairro para a próxima semeadura.

## Validação
- `npm run build` passou.
- `npm run typecheck` passou.
- `npm run verify` passou.

## Números principais
- `/postos/cadastrar`: `8.21 kB` de route size e `123 kB` de First Load JS.
- `/admin/ops/cobertura-territorial`: `172 B` de route size e `106 kB` de First Load JS.
- Shared JS global: `103 kB`.

## Leitura operacional
- O papel `station_editor` continua restrito.
- O modo de campo reduz atrito para semear varios postos em sequência.
- A fila de curadoria e a cobertura territorial continuam separadas do admin amplo.
