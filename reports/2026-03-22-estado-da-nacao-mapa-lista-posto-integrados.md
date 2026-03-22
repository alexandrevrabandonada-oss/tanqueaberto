# Estado da Nação — Mapa, lista e posto integrados

Data: 2026-03-22

## O que mudou
- O contexto de navegação agora é preservado entre mapa, lista e tela de posto.
- A home recebe `q`, `fuel`, `recency` e `presence` e repassa esse contexto para o mapa e para os cards.
- O mapa ganhou um card rápido ao tocar em um pin, com acesso direto para abrir o posto ou enviar preço.
- A lista do recorte atual ficou sincronizada com mapa e filtros.
- A tela do posto agora oferece retorno explícito ao mapa e CTA de envio contextual.
- O fluxo de envio passou a aceitar `stationId` pré-selecionado e volta para o contexto anterior após concluir.

## Estrutura afetada
- `app/page.tsx`
- `components/home/home-browser.tsx`
- `components/map/station-map.tsx`
- `components/map/station-map-shell.tsx`
- `components/station/station-card.tsx`
- `app/postos/[id]/page.tsx`
- `app/enviar/page.tsx`
- `components/forms/price-submit-form.tsx`

## Resultado prático
- Explorar o mapa fica menos solto.
- Abrir um posto e voltar não perde o recorte atual.
- O envio de preço passou a funcionar como continuação do fluxo, não como tela isolada.
- Postos sem preço recente continuam acionáveis a partir do mapa e da lista.

## Pendências
- O card rápido do mapa ainda pode ganhar densidade visual quando houver mais dados por posto.
- A lista do recorte pode receber ordenação mais contextual por recência e presença.
- O retorno de contexto ainda depende de parâmetros na URL, sem estado persistido entre sessões.

## Riscos
- Se o usuário compartilhar URLs com parâmetros inválidos, a sanitização precisa continuar rígida.
- O excesso de contexto na URL pode crescer se mais filtros forem adicionados sem disciplina.

## Validação
- `npm run build`
- `npm run typecheck`
- `npm run lint`

## Próximos passos recomendados
- Adicionar uma ordenação mais inteligente na lista do recorte.
- Melhorar a apresentação do card rápido com mais sinais de recência e presença.
- Persistir o último contexto da navegação localmente para reduzir perda entre sessões curtas.
