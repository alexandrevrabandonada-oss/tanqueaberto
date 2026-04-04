# Estado da Nacao: acabamento da superficie mais barato

## Diagnostico curto
A leitura de `mais barato` ja existia, mas ainda misturava contextos diferentes em uma mesma camada visual. O resultado era simples demais para decisao real: faltava separar o que ainda esta confiavel do que apenas parece barato, e os CTAs por item ainda estavam curtos para quem quer sair para abastecer.

## O que entrou nesta passada
- reforco visual de `recencia`, `confianca` e `distancia` no topo da superficie
- separacao em tres leituras operacionais e populares:
  - `Mais barato recente`
  - `Mais barato perto`
  - `Barato, mas desatualizado`
- cards de item com sinais mais claros:
  - badge de atualizacao
  - badge de confianca
  - badge de contexto
  - badge de distancia quando houver
- CTAs por item:
  - `Ver posto`
  - `Atualizar preco`
  - `Tracar rota` quando o posto tiver coordenadas validas
- preservacao do fluxo atual de mapa, posto e envio sem reabrir arquitetura

## Antes
- a area de economia ficava mais proxima de ranking do que de decisao pratica
- recencia, confianca e distancia apareciam, mas sem hierarquia suficiente
- faltava separar preco bom e recente de preco bom porem envelhecido
- o usuario ainda precisava dar passos extras para abrir rota ou decidir se valia confiar naquele dado

## Depois
- o usuario entende primeiro se o preco ainda esta quente, perto e confiavel
- cada lista responde uma pergunta diferente de abastecimento:
  - onde esta barato agora
  - onde esta barato perto de mim
  - onde esta barato, mas precisa ser conferido
- o CTA de rota reduz atrito para uso real na rua
- a superficie continua leve e popular, sem jargao tecnico nem tela pesada

## Arquivos tocados
- `components/home/home-deferred-sections.tsx`

## Validacao esperada
- `npm run typecheck`
- `npm run build`
- `npm run verify`
