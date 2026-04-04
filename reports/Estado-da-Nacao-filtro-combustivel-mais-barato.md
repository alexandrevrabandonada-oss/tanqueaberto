# Estado da Nacao: filtro de combustivel na superficie mais barato

## Diagnostico curto
A superficie `mais barato` ja estava mais clara sobre recencia, confianca e distancia, mas ainda faltava o corte mais importante para decisao real: ver apenas o combustivel que a pessoa quer abastecer. Sem isso, gasolina, etanol, diesel e GNV continuavam disputando a mesma atencao.

## Patch completo

### Filtro explicito e persistente
- adicionado filtro principal de combustivel no topo da superficie
- o filtro cobre:
  - gasolina comum
  - gasolina aditivada
  - etanol
  - diesel S10
  - diesel comum
  - GNV
- a ultima escolha fica salva no aparelho em `localStorage`
- quando a home ja chega com um combustivel especifico pela rota, a superficie respeita esse contexto sem perder a preferencia local

### Leituras afetadas
O filtro agora passa a dirigir toda a leitura de economia:
- `Perto de voce`
- `Por bairro`
- `Por cidade`
- `Mais barato recente`
- `Mais barato perto`
- `Barato, mas desatualizado`

### Cards e utilidade pratica
- todos os cards da area mostram apenas o combustivel selecionado
- reforco visual de:
  - preco
  - recencia
  - confianca
  - distancia
- CTA de atualizacao passa a levar para enviar aquele combustivel especifico
- CTA de rota foi mantido no mesmo item

## Antes
- a pessoa ainda podia comparar combustiveis diferentes sem querer
- o contexto de `mais barato` ajudava, mas nao fechava a decisao de abastecimento real
- faltava memoria local da preferencia de combustivel

## Depois
- a superficie lembra qual combustivel a pessoa quer ver
- a comparacao fica limpa e coerente com a decisao de abastecimento
- o bloco responde melhor tres perguntas populares:
  - onde esta mais barato perto de mim
  - onde esta mais barato no bairro
  - onde esta mais barato na cidade
- os CTAs continuam curtos e prontos para uso de rua

## Arquivos tocados
- `components/home/home-deferred-sections.tsx`

## Validacao esperada
- `npm run typecheck`
- `npm run build`
- `npm run verify`
