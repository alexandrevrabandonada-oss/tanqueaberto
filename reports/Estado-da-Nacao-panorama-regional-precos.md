# Estado da Nacao: panorama regional de precos

## Diagnostico curto

A home ja estava mais limpa e mais orientada para decisao pessoal, mas faltava uma superficie publica para leitura territorial. O produto ainda nao oferecia, de forma organizada, um panorama por regiao, cidade e bairro com sinais prudentes de concentracao ou sincronia de precos.

## Patch aplicado

Arquivos principais:

- `app/atualizacoes/panorama/page.tsx`
- `components/updates/regional-price-panorama.tsx`
- `lib/panorama/regional-prices.ts`
- `app/atualizacoes/page.tsx`
- `components/home/home-simplified-sections.tsx`

Mudancas:

1. criei uma superficie secundaria em `Atualizacoes > Panorama regional`.
   A home continua curta e pessoal; a leitura territorial foi deslocada para uma rota propria.

2. organizei o panorama em tres recortes:
   - regiao
   - cidade
   - bairro

3. cada recorte agora mostra:
   - menor preco
   - preco medio
   - faixa de preco
   - quantidade de leituras
   - recencia da base

4. adicionei sinais curtos e prudentes quando ha padrao simples:
   - baixa variacao de precos
   - reajuste muito sincronizado
   - concentracao suspeita de precos
   - acima da media regional

5. mantive prudencia editorial:
   - a UI fala em suspeita, padrao, concentracao e sincronia
   - nao ha linguagem afirmativa de cartel

6. mantive a home limpa:
   - so entrou um link discreto para `Panorama regional`
   - o bloco principal da home nao voltou a empilhar cards longos

## Antes

- a home precisava carregar parte da leitura territorial mesmo sem ser o lugar ideal;
- `Atualizacoes` era basicamente feed recente;
- faltava uma camada publica para enxergar regioes, cidades e bairros em conjunto;
- nao havia sinais territoriais prudentes sobre concentracao ou sincronia.

## Depois

- a home continua focada em decisao pessoal rapida;
- `Atualizacoes` ganhou uma superficie secundaria de panorama territorial;
- o produto passa a mostrar menor preco, media, faixa, volume e recencia por recorte;
- surgem alertas prudentes que ajudam leitura publica e politica sem exagerar a conclusao.

## Efeito esperado

- mais utilidade publica para acompanhar preco por territorio;
- mais clareza para debate local sobre concentracao e sincronismo;
- menos pressao para enfiar analise territorial dentro da home;
- melhor separacao entre decisao pessoal e leitura estrutural de mercado.
