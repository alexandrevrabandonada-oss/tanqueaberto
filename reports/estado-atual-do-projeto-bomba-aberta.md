# Estado atual do projeto Bomba Aberta

## Resumo executivo

O Bomba Aberta está em estado de release público validado. O domínio público real responde, o runtime público foi isolado das falhas internas de ops/auditoria e as superfícies principais de rua já estão simplificadas para mobile real.

O `HEAD` atual no momento deste relatório é `2bc10f3` (`fix: remover fila flutuante do envio`). Esse último ajuste removeu o assistente fixo de fila da rota `/enviar`, que estava cobrindo o formulário principal e criando bloqueio visual no celular.

## Situação funcional

- `home`: reduzida para eixo principal claro, lista-first no mobile e mapa como superfície secundária quando necessário.
- `mapa-lite` e `mapa completo`: compactados para reduzir altura desperdiçada acima da dobra e acelerar a leitura útil.
- `seletor de posto`: desambiguado com proximidade, recência e contexto suficiente para reduzir erro de toque.
- `envio`: guiado em etapas, com revisão final obrigatória e fila local rebaixada para papel secundário.
- `hub`: simplificado para iniciantes, mas ainda inteligente para recorrentes quando há lastro real.
- `acessibilidade e linguagem`: microcopy mais curta, menos jargão e menos ruído técnico nas superfícies públicas.

## Situação operacional

- `go-live` público real: validado.
- `schema/runtime`: reconciliado e saneado nas superfícies críticas.
- `telemetria e observabilidade`: consolidadas para leitura operacional e go-live.
- `antiabuso e moderação`: endurecidos sem exigir login tradicional.
- `mobile low-perf`: modo agressivo e lista-first disponíveis.

## O que foi consolidado recentemente

- Remoção do `QueueAssistant` fixo na rota `/enviar`, evitando sobreposição da fila sobre o formulário principal.
- Fila local mantida como superfície secundária compacta dentro do fluxo de envio.
- Polimento operacional nas superfícies mobile, com menos altura gasta e menos cards competindo.
- Consolidação de relatórios de Estado da Nação em `reports/` para auditoria e operação.

## Estado do repositório

- O worktree continua amplo e sujo por várias frentes paralelas já existentes.
- Há muitos relatórios históricos e artefatos de evidência em `reports/`.
- Persistem warnings antigos de cache do webpack e o warning conhecido de hook em `components/layout/retention-hub.tsx`.
- Esses avisos não impedem o build, o typecheck nem o verify, mas ainda são ruído operacional.

## Validação mais recente

- `npm run build` passou.
- `npm run typecheck` passou.
- `npm run verify` passou.

## Leitura prática

Se a meta for entrega para usuário real, a base já está pronta. O próximo trabalho não é reabrir fluxo central; é continuar o saneamento fino e a organização de release sem regressão de comportamento público.
