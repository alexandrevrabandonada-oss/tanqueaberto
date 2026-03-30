# Estado da Nação: Hub brutalmente simples

## Resumo executivo
O Meu Hub foi simplificado para que uma pessoa iniciante entenda em segundos o que aconteceu, o que fazer agora e por que isso importa. O fluxo agora reduz cards paralelos, esconde sinais competitivos quando não há lastro real e preserva a versão rica apenas para usuários recorrentes com contexto suficiente.

## O que mudou
- zero-state ficou com um único eixo principal
- returning-state ficou centrado em continuidade e próximo passo
- os sinais de impacto, missão, fila e memória deixam de competir quando o Hub ainda está ganhando lastro
- usuários experientes continuam vendo a versão mais rica quando há contexto operacional real

## Lógica de simplificação
O Hub simplifica quando:
- a fase progressiva ainda está em `visitor-open` ou `guest-collaborator`
- não há missão ativa
- não existe fila local, pendência relevante, memória ou impacto suficiente

Quando simplifica:
- o bloco principal fica dominante
- estatísticas paralelas saem de cena
- as seções de sessão, fila, impacto e memória deixam de aparecer juntas
- a jornada fica mais curta e mais fácil de ler

## Iniciante vs recorrente
### Iniciante
- vê só o que importa agora
- enxerga um CTA dominante por contexto
- não é bombardeado por cards paralelos
- entende o próximo gesto em poucos segundos

### Recorrente
- continua vendo histórico, fila, impacto e memória quando há lastro real
- mantém acesso a retomada de missão, pendências e contexto local
- recebe mais informação sem perder a linha principal

## Patch aplicado
- [`components/hub/collector-hub.tsx`](C:/Projetos/Tanque%20Aberto/components/hub/collector-hub.tsx)
- [`components/hub/hub-activation-hero.tsx`](C:/Projetos/Tanque%20Aberto/components/hub/hub-activation-hero.tsx)
- [`app/hub/page.tsx`](C:/Projetos/Tanque%20Aberto/app/hub/page.tsx)

## Antes / Depois
### Antes
- vários cards paralelos competiam entre si
- impacto, missão, fila e continuidade ficavam densos logo na entrada
- o iniciante precisava entender mais do que o necessário

### Depois
- o Hub abre com um eixo principal
- o próximo passo fica mais claro
- a versão rica só aparece quando existe lastro real
- a leitura inicial ficou mais curta e mais direta

## Validação
- `npm run typecheck` passou
- `npm run build` passou
- `npm run verify` passou

## Risco residual
- a riqueza operacional continua disponível e útil, então a simplificação depende das regras de fase e lastro permanecerem estáveis
- há componentes legados do Hub fora desta passada, mas o fluxo principal já ficou mais simples
