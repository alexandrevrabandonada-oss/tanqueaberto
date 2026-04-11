# Estado da Nacao: home com melhor preco vs melhor escolha

## Diagnostico curto

A home curta ainda concentrava a leitura principal em um unico card de "melhor agora", misturando preco, proximidade e recorte. Isso deixava duas ambiguidades:

- faltava uma visao explicita do menor preco bruto recente da cidade;
- a recomendacao pratica ainda podia pender demais para proximidade ou para um unico escopo de lista.

## Patch aplicado

Arquivo principal:

- `components/home/home-simplified-sections.tsx`

Mudancas:

1. substituicao da estrutura por abas e grupos de escopo por um bloco unico de decisao com dois cards principais:
   - `Melhor preco da cidade`
   - `Vale mais a pena para voce`

2. criacao de score de custo-beneficio para o card pessoal, combinando:
   - preco relativo ao piso da cidade
   - economia estimada em 50L contra a media recente do recorte
   - distancia
   - recencia
   - confianca do dado

3. blindagem contra vies de proximidade:
   - postos muito proximos mas quase sem ganho real perdem peso;
   - postos um pouco mais longe sobem quando a economia estimada realmente compensa o desvio.

4. classificacao curta da recomendacao pratica:
   - `vale no caminho`
   - `vale desviar`
   - `barato, mas longe`
   - `barato, mas velho`

5. preservacao dos CTAs do fluxo:
   - `Ver posto`
   - `Atualizar preco`
   - `Tracar rota`

## Antes

- um card principal misturava preco bruto e utilidade pratica;
- o usuario nao via claramente o menor preco da cidade;
- a logica da home curta ainda carregava o legado de escopos (`perto`, `bairro`, `cidade`, `desatualizado`);
- a leitura pratica podia parecer "posto mais perto" em vez de "posto que compensa".

## Depois

- a home curta separa leitura ampla e leitura pessoal;
- o menor preco bruto recente da cidade aparece de forma explicita;
- a melhor escolha para a pessoa agora nasce de um score de custo-beneficio real;
- a explicacao do score deixa claro que proximidade sozinha nao decide;
- a interface continua curta, com apenas dois cards principais de decisao.

## Efeito esperado

- mais clareza entre "mais barato" e "mais vantajoso";
- menos vies para o posto so mais perto;
- home mais escaneavel, sem reabrir pilha de cards.
