# Estado da Nacao: calibracao do ranking de sugestao de posto

## Diagnostico curto
A sugestao automatica estava boa, mas ainda tinha dois riscos:
- o ultimo posto usado podia continuar vencendo mesmo quando o usuario mudou de area;
- a proximidade podia ganhar peso demais quando a geolocalizacao vinha imprecisa.

## O que foi ajustado

### 1. Ranking mais equilibrado
Arquivo: `components/forms/price-submit-form.tsx`
- o ranking agora junta visibilidade, geo confiavel, cidade atual, proximidade, recencia e ultimo contexto de envio;
- o ultimo posto usado ganhou decaimento por idade do ultimo uso;
- quando a cidade atual difere da cidade do ultimo posto, esse peso cai de forma forte;
- a proximidade passou a valer menos quando a precisao do GPS e ruim.

### 2. Sugestao mais curta
Arquivo: `components/forms/price-submit-form.tsx`
- o motivo da sugestao ficou mais curto e direto;
- estados continuam em tres niveis:
  - alta confianca
  - media confianca
  - sem confianca forte

### 3. Sinal mais claro no picker
Arquivo: `components/forms/price-submit-station-picker.tsx`
- a frase de apoio agora acompanha o nivel da sugestao;
- quando a cidade mudou, o texto do ultimo posto deixa claro que a area mudou;
- quando a confianca e alta, o texto fica curto e operacional.

## Antes / Depois

### Antes
- o ultimo posto usado podia continuar forte demais mesmo fora da area do usuario;
- a proximidade podia empurrar um posto errado quando o GPS vinha fraco;
- a sugestao podia parecer mais certa do que realmente era.

### Depois
- o ultimo posto usado perde peso com o tempo;
- o ultimo posto usado perde peso quando a area mudou;
- proximidade ruim e GPS impreciso agora contam menos;
- a sugestao automatica continua forte, mas mais honesta.

## Regras novas do ranking
- ultimo posto usado agora decai com o tempo;
- area/cidade diferente corta boa parte da forca do ultimo contexto;
- GPS com precisao fraca reduz a influencia da distancia;
- a escolha final continua caindo para lista, recencia e cidade quando o contexto nao e confiavel.

## Arquivos alterados
- `components/forms/price-submit-form.tsx`
- `components/forms/price-submit-station-picker.tsx`
- `hooks/use-geolocation.ts`
- `app/enviar/actions.ts`

## Validacao
- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou

## Observacao
A primeira tentativa de validacao em paralelo gerou falso negativo de cache/tipos do Next. A validacao final foi refeita em sequencia limpa e passou inteira.
