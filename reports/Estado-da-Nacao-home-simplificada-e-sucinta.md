# Estado da Nacao: Home simplificada e sucinta

## Diagnostico curto

A home estava forte em capacidade, mas longa demais em superficie.

Os principais problemas eram:

- muitos blocos empilhados com papeis parecidos
- repeticao do mesmo posto em recortes diferentes
- explicacao demais dentro da propria home
- mistura de descoberta, decisao e colaboracao na mesma altura visual
- mapa e cards detalhados competindo pela primeira dobra

Na pratica, a tela inicial passava a sensacao de fluxo infinito, mesmo quando o usuario ja tinha informacao suficiente para decidir ou colaborar.

## Patch completo

### 1. Reorganizacao da home em 4 blocos principais

O topo continua como bloco 1 e agora mostra de forma mais clara:

- busca
- cidade
- GPS
- combustivel

O miolo da home foi refeito para operar em tres blocos compactos adicionais:

- bloco 2: `Melhor agora`
- bloco 3: `Mais opcoes`
- bloco 4: `Colaborar agora`

Arquivos centrais:

- `components/layout/top-orchestrator.tsx`
- `components/home/home-browser.tsx`
- `components/home/home-simplified-sections.tsx`

### 2. Fusao das superficies repetidas

Foi removida a pilha anterior de superfícies longas de economia e comparacao.

No lugar:

- `Melhor agora` funde o antigo `vale a pena para mim` com a leitura de oportunidade
- `Mais opcoes` funde perto, bairro, cidade e desatualizado em uma unica superficie com chips
- mapa deixa de ocupar a home inteira por padrao e passa a abrir sob demanda dentro de `Mais opcoes`

### 3. Reducao forte de texto e altura

Cada card principal passou a seguir o mesmo padrao:

- titulo curto
- linha unica de apoio
- preco em destaque quando existe
- poucas badges realmente decisivas
- CTAs diretas

Foram removidos da pilha principal:

- parágrafos longos explicando criterio
- comparador flex detalhado
- economia estimada detalhada
- grade de sinais conceituais
- bloco separado de atualizacoes recentes

### 4. Dedupe entre recortes

O bloco `Mais opcoes` agora agrega candidatos por posto.

Quando um mesmo posto lidera em mais de um recorte, ele aparece uma vez no `Resumo`, com badges como:

- `Perto`
- `Bairro`
- `Cidade`
- `Desatualizado`

Isso reduz repeticao de cards quase identicos e deixa a decisao mais escaneavel.

### 5. Analise secundaria fora da pilha principal

As leituras mais analiticas sairam da home curta e ficaram apontadas por CTA:

- `Ver analise`
- `Ver atualizacoes`
- `Abrir mapa`

Assim, a home responde rapido e a analise detalhada continua acessivel sem inflar a primeira experiencia.

### 6. Segunda passada: onboarding e apoios recolhidos

Depois da simplificacao principal, ainda restavam prompts auxiliares que podiam crescer demais em alguns estados:

- onboarding
- identidade progressiva
- avisos adicionais
- prompts de apoio operacional

Essa camada foi recolhida para uma rail secundaria expansivel:

- `Apoios e onboarding recolhidos`

Com isso:

- a home util continua curta por padrao
- sinais criticos continuam visiveis quando existem
- onboarding e apoios nao disputam a primeira leitura com decisao e colaboracao
- a home deixa de depender de reveal deferido para mostrar os blocos principais

### 7. Terceira passada: topo mais seco no mobile

Depois da home curta e da rail secundaria, o topo ainda podia gastar altura demais no celular.

Essa passada enxugou especificamente o `TopOrchestrator`:

- busca com placeholder mais curto no mobile
- faixa unica de contexto com cidade, GPS, combustivel e botao de ajustes
- botao de filtros renomeado para `Ajustes`, com contagem quando existir recorte ativo
- painel avancado com `Limpar` rapido
- menos quebra vertical no topo compacto

Na pratica, o topo continua mostrando o que importa, mas com menos linhas e menos ruido visual no celular.

### 8. Quarta passada: `Mais opcoes` ainda mais curto no mobile

Depois do topo, o bloco `Mais opcoes` ainda acumulava altura no celular por tres motivos:

- chips quebrando em mais de uma linha
- caixa de contexto ocupando area demais
- terceiro card entrando cedo demais na pilha

Essa passada fez um corte local nesse bloco:

- chips em faixa horizontal rolavel, em vez de quebrar
- resumo ativo mais curto no mobile
- cards com padding e CTAs menores
- terceiro card escondido abaixo de `sm`, preservado no desktop

Na pratica, `Mais opcoes` continua util, mas volta a caber como superficie de consulta rapida, sem alongar a home no celular.

## Antes e depois

### Antes

- home com muitos cards verticais e muito texto por secao
- hero mobile repetindo informacao que reaparecia mais abaixo
- blocos de economia, oportunidade, comparador flex e economia estimada competindo entre si
- posto repetido entre perto, bairro e cidade
- mapa grande logo na pilha principal, mesmo quando o usuario queria apenas decidir rapido

### Depois

- home curta, centrada em quatro blocos claros
- topo com busca, cidade, GPS e combustivel
- um unico card principal de decisao
- uma unica superficie de opcoes com chips e resumo deduplicado
- colaboracao visivel sem empurrar a tela para baixo com explicacao demais
- mapa preservado, mas aberto sob demanda
- onboarding e prompts auxiliares recolhidos em rail secundaria abaixo do nucleo principal
- topo mobile mais seco, com contexto e ajustes em uma faixa compacta
- bloco `Mais opcoes` mais curto no mobile, com chips em uma faixa e menos empilhamento inicial

## Validacao

Rodado com sucesso:

- `npm run build`
- `npm run typecheck`
- `npm run verify`

Observacoes do ambiente atual:

- `verify` terminou sem erros, mas manteve warnings preexistentes de `img` sem `next/image`
- `verify` tambem manteve warnings preexistentes de dependencias em `useEffect` em `components/forms/price-submit-form.tsx`
- a auditoria de ambiente continua recomendando definir `STATION_EDITOR_SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL` e `NEXT_PUBLIC_APP_URL`

## Resultado prático

Esta passada reduz a sensacao de home infinita sem desmontar a capacidade existente.

O fluxo principal agora fica muito mais claro:

1. entender o recorte no topo
2. olhar a melhor decisao do momento
3. abrir alternativas sem repetir posto
4. colaborar onde ainda falta preco