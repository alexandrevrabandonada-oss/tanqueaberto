# Estado da Nacao · vale a pena para mim

Data: 2026-04-04

## Diagnostico curto
A superficie de economia ja ajudava a achar o menor preco, mas ainda faltava o passo decisivo de rua: responder quando um posto barato realmente vale a ida, quando a leitura ainda esta fraca e quando etanol ou gasolina fecham melhor para carro flex.

## Patch completo
Arquivo principal alterado:
- `components/home/home-deferred-sections.tsx`

Entradas novas na superficie:
- bloco `Vale a pena para mim` com leitura resumida de melhor opcao perto de voce, no bairro e na cidade
- score pratico leve combinando preco, recencia, confianca e distancia
- comparador `Gasolina x etanol` com regra popular dos 70% quando houver dados suficientes no mesmo posto
- bloco `Economia estimada` contra a media recente do recorte, com leitura por 40L e 50L quando existir base honesta
- reforco visual de recomendacao forte, cautelosa ou fraca sem esconder o preco bruto
- preservacao dos CTAs operacionais ja existentes nos cards: ver posto, atualizar preco e tracar rota

## Antes
- a home mostrava o menor preco bruto por recorte, mas com pouca ajuda para decidir se valia a pena sair agora
- gasolina e etanol nao tinham uma leitura popular dedicada de comparacao flex
- economia estimada no tanque ainda nao aparecia
- o resumo por perto, bairro e cidade ainda estava mais perto de ranking do que de decisao pratica

## Depois
- a home continua mostrando o preco bruto, mas contextualiza melhor quando ele realmente vale a pena
- o app agora resume a melhor opcao perto de voce, no bairro e na cidade com peso de distancia, recencia e confianca
- quando gasolina comum e etanol aparecem no mesmo posto com base suficiente, o comparador flex entrega um `etanol compensa` ou `gasolina compensa` sem virar calculadora complexa
- quando existe base recente suficiente para o combustivel filtrado, a interface estima economia simples por 40L e 50L
- leituras fracas ou velhas nao recebem recomendacao forte

## Notas operacionais
- o comparador flex ficou propositalmente conservador: ele so compara quando gasolina comum e etanol aparecem no mesmo posto
- a economia estimada usa media recente do recorte e exige base minima antes de prometer poupanca
- a filtragem principal por combustivel continua persistida no aparelho

## Validacao esperada
Executar:
- `npm run typecheck`
- `npm run build`
- `npm run verify`