# Estado da Nação: mapa lite / lista first

## Resumo executivo
A home pública passou a abrir mais leve em mobile e contexto de rua. Em vez de depender do mapa como primeira leitura, o app pode começar pela lista, pela recência e pela proximidade, e só monta o mapa quando isso realmente ajuda.

## Lógica de fallback
O modo lista-first entra quando:
- o servidor identifica mobile pelo `user-agent`
- o cliente detecta tela estreita
- o modo de baixo desempenho está ativo
- o contexto de rua pede uma leitura mais rápida que visual

Quando o modo lista-first está ativo:
- o mapa deixa de ser protagonista
- a home mostra uma superfície leve com botão para abrir o mapa
- o mapa só monta quando o usuário pede ou quando o contexto deixa de ser leve

## Patch aplicado
- [`app/page.tsx`](C:/Projetos/Tanque%20Aberto/app/page.tsx): passa um sinal inicial de mobile/lite para a home
- [`components/home/home-browser.tsx`](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx): conecta o sinal e troca a superfície do mapa
- [`components/home/home-map-surface.tsx`](C:/Projetos/Tanque%20Aberto/components/home/home-map-surface.tsx): nova superfície de mapa lite com botão de abertura
- [`components/map/station-map-shell.tsx`](C:/Projetos/Tanque%20Aberto/components/map/station-map-shell.tsx): mantém montagem adiada e versão compacta
- [`components/map/station-map.tsx`](C:/Projetos/Tanque%20Aberto/components/map/station-map.tsx): reduz a camada visual do mapa quando compacto

## Antes / Depois
### Antes
- o mapa era a superfície principal mesmo em mobile fraco
- a lista existia, mas disputava atenção com um mapa pesado
- não havia uma abertura clara para “lista primeiro”

### Depois
- mobile fraco e contexto de rua entram pela lista
- o mapa vira uma superfície secundária e leve
- o usuário pode abrir o mapa quando fizer sentido
- o fluxo de encontrar posto e agir fica mais rápido no toque

## Critério operacional
O caminho novo é o mesmo de antes, só mais curto:
- encontrar posto pela lista, proximidade e recência
- abrir o posto
- enviar preço
- voltar ao mapa quando necessário

## Validação
- `npm run typecheck` passou
- `npm run build` passou
- `npm run verify` passou

## Risco residual
- a home ainda mantém várias superfícies legadas que já existem no produto; esta passada só muda a prioridade do mapa no mobile
- o mapa continua disponível e funcional, mas não é mais a primeira leitura em dispositivos e contextos mais fracos
