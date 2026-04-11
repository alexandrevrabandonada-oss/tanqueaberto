# Estado da Nacao: home com regiao funcional e conurbacao

## Diagnostico curto

A home ja separava preco bruto de custo-beneficio pessoal, mas ainda dependia demais da fronteira administrativa do municipio selecionado. Isso deixava a leitura estreita para um uso real em conurbacao, especialmente no eixo Volta Redonda, Barra Mansa e Barra do Pirai.

## Patch aplicado

Arquivos principais:

- `lib/geo/functional-regions.ts`
- `components/home/home-browser.tsx`
- `components/home/home-simplified-sections.tsx`

Mudancas:

1. criei um recorte regional funcional configuravel.
   Para o contexto de Volta Redonda, a home agora considera por padrao:
   - Volta Redonda
   - Barra Mansa
   - Barra do Pirai

2. a camada de decisao da home deixou de usar apenas o municipio e passou a consumir uma base regional quando houver regiao funcional configurada.

3. reorganizei a home curta em tres leituras principais:
   - `Perto de voce`
   - `Vale mais a pena para voce`
   - `Melhor preco da regiao`

4. recalibrei a recomendacao pessoal com:
   - preco
   - distancia
   - recencia
   - confianca
   - economia estimada
   - penalidade por desvio

5. mantive deduplicacao por contexto:
   - quando o mesmo posto vence mais de uma leitura, a UI usa badges como `Perto`, `Melhor para voce` e `Menor preco da regiao` em vez de virar repeticao cega.

## Antes

- a home podia olhar so para a cidade selecionada;
- o melhor preco relevante podia ficar invisivel se estivesse logo na cidade conurbada ao lado;
- proximidade, custo-beneficio e leitura ampla ainda nao refletiam bem o deslocamento real da populacao.

## Depois

- a home enxerga o eixo urbano funcional quando houver configuracao regional;
- o bloco amplo virou `melhor preco da regiao`;
- a decisao pessoal considera melhor o custo real do desvio;
- a camada principal fica mais aderente a quem circula entre cidades vizinhas no mesmo tecido urbano.

## Efeito esperado

- mais aderencia ao deslocamento real entre Volta Redonda, Barra Mansa e Barra do Pirai;
- menos dependencia da fronteira administrativa do municipio;
- leitura mais util entre o que esta perto, o que mais compensa e o menor preco relevante no eixo regional.
