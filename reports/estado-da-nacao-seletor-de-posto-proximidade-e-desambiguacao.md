# Estado da Nacao: seletor de posto por proximidade e desambiguacao

## Objetivo
Reduzir a friccao de rua na escolha de posto em `/enviar`, saindo de uma lista gigante e cega para um picker operacional com proximidade, memoria curta e busca contextual.

## O que mudou
- O `select` longo foi substituido por um picker mobile-first em [components/forms/price-submit-form.tsx](C:/Projetos/Tanque%20Aberto/components/forms/price-submit-form.tsx).
- A abertura do fluxo agora prioriza tres entradas:
  - `Mais proximos de voce`
  - `Recentes e por onde voce passou`
  - `Outros postos bem ranqueados`
- A busca textual passou a filtrar por nome publico, bairro, endereco curto, cidade e bandeira/distribuidora.
- Cada item agora mostra contexto minimo para desambiguacao: nome publico, bairro, endereco curto, distancia quando houver, cidade, bandeira/distribuidora e sinal de confianca geografica.

## Logica de ordenacao
A ordenacao do picker ficou assim:
1. Recencia pessoal do aparelho e da sessao local.
2. Visibilidade publica e estado de release do posto.
3. Qualidade geografica:
   - `geo_review_status = ok`
   - `geo_review_status = pending`
   - sem coordenada confiavel
   - `manual_review`
4. Match com contexto recente de cidade.
5. Distancia, quando houver geolocalizacao.
6. Menor ambiguidade entre nomes parecidos.

## Fontes usadas para contexto
- `useGeolocation()` para calcular distancia real em metros/km.
- `useStreetSession()` para memoria curta de postos vistos e tocados.
- `useMySubmissions()` para ultimos postos enviados.
- `readHomeContext()` e `readLastStationContext()` para reaproveitar o recorte util vindo de mapa/lista/posto.

## Regras praticas
- Postos com coordenada valida e `geo_review_status` melhor sobem.
- Postos sem coordenada confiavel descem no ranking.
- Nomes potencialmente ambiguos recebem badge de alerta.
- Quando houver localizacao, o grupo inicial usa raio inteligente de `2 km` ou `5 km`.
- Quando nao houver localizacao, o fluxo nao despeja lista completa; ele abre com recentes e ranking operacional, mantendo busca forte.

## Resultado esperado
- Menos esforco para encontrar o posto certo.
- Menos erro entre postos de mesmo nome.
- Proximidade influencia a escolha de forma real.
- O inicio da rota `/enviar` deixa de ser uma lista enorme e passa a ser um fluxo guiado.
- O fluxo anonimo continua intacto, sem login e sem cadastro novo.

## Diff focado
- [components/forms/price-submit-form.tsx](C:/Projetos/Tanque%20Aberto/components/forms/price-submit-form.tsx)

## Validacao
- `npm run typecheck`
- `npm run build`
- `npm run verify`

## Observacao
A passada ficou restrita ao seletor de posto. Nao houve mudanca de login, branding ou abertura de cadastro publico.
