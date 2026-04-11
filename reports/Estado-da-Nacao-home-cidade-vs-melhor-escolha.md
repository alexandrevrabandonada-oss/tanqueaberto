# Estado da Nacao: home cidade vs melhor escolha

## Diagnostico curto

A home ja separava preco bruto de custo-beneficio, mas ainda com pouca distancia visual e sem explicar bem quando o menor preco da cidade realmente vale a ida. Havia tres problemas principais:

- os dois blocos ainda podiam parecer o mesmo card com roupas diferentes;
- o mesmo posto podia liderar os dois lados sem contexto suficiente;
- faltava uma traducao mais clara de economia liquida por tanque para responder "vale desviar?".

## Patch aplicado

Arquivo principal:

- `components/home/home-simplified-sections.tsx`

Mudancas:

1. `Melhor preco da cidade` virou uma leitura curta de top 3, em vez de card unico.
   Cada item agora mostra:
   - preco
   - bairro
   - distancia
   - recencia

2. `Vale mais a pena para voce` foi recalibrado com score usando:
   - preco relativo ao piso da cidade
   - distancia
   - recencia
   - confianca
   - economia bruta e liquida em 40L/50L

3. a decisao pratica agora sai em linguagem curta:
   - `vale no caminho`
   - `vale pequeno desvio`
   - `so compensa se voce ja for passar`
   - `barato, mas velho`
   - `mais barato da cidade, mas longe`

4. deduplicacao sem sumir com contexto:
   - se o mesmo posto lidera cidade e escolha pessoal, o top 3 continua mostrando a visao ampla;
   - o card pessoal muda de tom e assume explicitamente que um posto venceu os dois lados, com badges de contexto.

5. reforco de custo-beneficio real:
   - o card pessoal mostra economia bruta em 40L/50L;
   - mostra economia liquida estimada;
   - explica que o deslocamento come parte da vantagem.

## Antes

- um bloco de cidade e um bloco pessoal ainda pareciam proximos demais;
- o menor preco bruto da cidade nao tinha leitura de ranking curta;
- a home explicava pouco quando o desvio compensava ou nao;
- repeticao de posto ainda parecia duplicacao, nao contextualizacao.

## Depois

- a cidade aparece como top 3 bruto, rapido de escanear;
- a escolha pessoal virou card de custo-beneficio liquido, com explicacao do ganho real;
- quando o mesmo posto vence nos dois lados, isso fica claro sem duplicar dois cards quase iguais;
- a home continua curta, com um bloco de lista e um bloco de decisao.

## Efeito esperado

- mais clareza entre "mais barato da cidade" e "mais vantajoso para mim";
- menos vies para o posto apenas mais proximo;
- melhor leitura de quando vale passar, quando vale pequeno desvio e quando o preco bruto nao sustenta a ida.
