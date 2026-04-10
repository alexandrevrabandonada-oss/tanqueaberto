# Estado da Nacao: Google Maps como padrao

## Diagnostico curto

Antes desta passada, o Bomba Aberta ainda mantinha Waze em pontos relevantes de navegacao:

- `lib/navigation/external-maps.ts`
  - o utilitario central ainda tinha suporte explicito a `waze`
- `components/station/station-card.tsx`
  - os CTAs de rota dos cards escolhiam `waze` no mobile
- `components/map/station-map.tsx`
  - o sheet do mapa ainda escolhia `waze` no mobile
- `components/routes/route-assistant.tsx`
  - o CTA de navegacao da rota assistida ainda escolhia `waze` no mobile
- `components/home/home-deferred-sections.tsx`
  - os atalhos de economia ainda escolhiam `waze` no mobile

Tambem existia um CTA direto em `app/postos/[id]/page.tsx` abrindo Google Maps por URL, mas fora do fluxo central de handoff.

## Patch aplicado

### Provider de rota

- `lib/navigation/external-maps.ts`
  - removido o uso de `waze`
  - Google Maps virou provider unico do utilitario
  - a URL passou a usar:
    - `https://www.google.com/maps/dir/?api=1`
    - `destination=lat,lng`
    - `travelmode=driving`
    - `dir_action=navigate`
  - o handoff local e a telemetria foram preservados

### Superficies atualizadas

- `components/station/station-card.tsx`
  - CTA `Traçar rota` agora abre sempre Google Maps
- `components/map/station-map.tsx`
  - CTA `Traçar rota` do sheet agora abre sempre Google Maps
- `components/routes/route-assistant.tsx`
  - CTA `Navegar` agora abre sempre Google Maps
- `components/home/home-deferred-sections.tsx`
  - CTAs de rota da superficie de economia agora abrem sempre Google Maps
- `app/postos/[id]/page.tsx`
  - CTA `COMO CHEGAR` foi alinhado para a mesma URL de Google Maps com navegacao direta

## Antes e depois

### Antes

- mobile:
  - os CTAs de rota preferiam `Waze`
- desktop:
  - normalmente caiam em `Google Maps`
- resultado:
  - comportamento inconsistente por superficie
  - friccao maior para quem nao usa Waze

### Depois

- mobile:
  - os CTAs de rota usam `Google Maps`
  - quando o sistema conseguir, abre o app; quando nao, cai no navegador
- desktop:
  - continua em `Google Maps`
- resultado:
  - um padrao unico para home, economia, cards, mapa, rota assistida e pagina de posto

## Varredura final

Depois do patch, nao restou ocorrencia de `waze` em `app/`, `components/`, `lib/` ou `hooks/`.

## Validacao

- `npm run build`
- `npm run typecheck`
- `npm run verify`
