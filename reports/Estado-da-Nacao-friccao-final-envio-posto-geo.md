# Estado da Nacao: friccao final entre envio, posto e geolocalizacao

## Diagnostico curto
Os pontos de borda ainda estavam concentrados em tres lugares:
- o formulario nao reaproveitava de forma forte o ultimo posto e o ultimo combustivel usados neste aparelho;
- a sugestao de posto proximo/recente ainda parecia fraca demais quando o app tinha bom sinal de contexto;
- o fluxo `nao achei meu posto` ainda dependia demais de GPS no servidor, o que aumentava abandono quando a geolocalizacao falhava.

## O que foi ajustado

### 1. Reuso forte do ultimo contexto de envio
Arquivo: `components/forms/price-submit-form.tsx`
- passei a persistir `ultimo posto + ultimo combustivel + cidade` em storage local do aparelho;
- esse contexto agora entra no ranking de posto recente;
- o combustivel sugerido agora tambem considera esse ultimo contexto, nao so historico remoto ou query.

### 2. Sugestao de posto mais forte e mais honesta
Arquivos:
- `components/forms/price-submit-form.tsx`
- `components/forms/price-submit-station-picker.tsx`

A sugestao agora separa melhor:
- `alta confianca`: posto muito proximo e com geo confiavel;
- `media confianca`: posto recente ou ultimo usado neste aparelho;
- `sem confianca forte`: busca aberta.

Tambem passei a mostrar o motivo da sugestao, em linguagem curta, para reduzir medo de escolher o posto errado.

### 3. Geolocalizacao com fallback humano
Arquivos:
- `hooks/use-geolocation.ts`
- `components/forms/price-submit-form.tsx`

Os estados ficaram menos tecnicos:
- sem localizacao suportada;
- usuario preferiu nao usar localizacao;
- localizacao nao apareceu agora;
- localizacao demorou demais;
- localizacao veio imprecisa.

O copy agora sempre aponta para a saida segura: buscar por rua, bairro ou nome.

### 4. Fluxo `nao achei meu posto` menos quebravel
Arquivos:
- `components/forms/price-submit-form.tsx`
- `components/forms/price-submit-station-picker.tsx`
- `app/enviar/actions.ts`

O caminho foi encurtado para:
- nome curto;
- rua/trecho;
- bairro opcional;
- bandeira opcional.

E o ponto principal:
- o servidor deixou de exigir coordenada para criar a proposta de posto novo;
- quando houver GPS, o posto entra com `pending` e contexto geografico melhor;
- quando nao houver GPS, o posto ainda pode ser proposto, entrando em `manual_review`.

Isso reduz abandono quando o GPS falha sem transformar o cadastro em fluxo pesado.

### 5. Prevenção de duplicidade mais integrada
Arquivo: `components/forms/price-submit-station-picker.tsx`
- mantive a lista de ate 3 parecidos/proximos antes de criar posto novo;
- reforcei nome, bandeira, trecho, distancia e ultimo preco recente;
- deixei a orientacao mais curta: primeiro escolher um parecido, so depois criar outro.

## Antes / Depois

### Antes
- ultimo posto e ultimo combustivel eram reaproveitados de forma parcial;
- a sugestao de posto parecia mais cosmetica do que confiavel;
- GPS negado ou indisponivel fazia o fluxo de posto novo parecer travado;
- o usuario podia ficar em duvida se o app estava seguro ou apenas chutando o posto;
- havia mais risco de duplicar posto por falta de saida clara.

### Depois
- o aparelho lembra o ultimo contexto util de envio;
- posto recente/proximo confiavel sobe com mais forca;
- a tela deixa claro quando o app esta seguro e quando esta apenas sugerindo;
- o fluxo `meu posto nao esta aqui` continua mesmo sem GPS;
- a criacao de posto novo passa primeiro pelos parecidos, reduzindo duplicidade.

## Patch focado
- `components/forms/price-submit-form.tsx`
- `components/forms/price-submit-station-picker.tsx`
- `hooks/use-geolocation.ts`
- `app/enviar/actions.ts`

## Validacao
- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou

## Observacao operacional
A validacao inicial em paralelo gerou falso negativo de `.next/types`. A execucao final foi refeita em sequencia limpa, que passou inteira e e a que vale para release.
