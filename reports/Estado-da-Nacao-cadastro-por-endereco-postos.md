# Estado da Nacao - cadastro por endereco de postos

Data: 2026-04-01

## 1. Diagnostico curto

O fluxo de semeadura de postos ja era leve e funcional para GPS/manual, mas faltava um caminho guiado por endereco para uso de campo quando o GPS nao estivesse disponivel ou confiavel. Isso gerava friccao e perda de qualidade de localizacao no primeiro cadastro.

## 2. Patch completo

Arquivos alterados:
- app/postos/cadastrar/actions.ts
- components/stations/station-seed-form.tsx
- app/postos/cadastrar/page.tsx

### 2.1. Opcao de localizacao no formulario

Em /postos/cadastrar, foi adicionado um seletor de modo de localizacao:
- Usar GPS atual
- Informar endereco

No modo endereco, foram adicionados campos curtos:
- rua
- numero
- bairro
- cidade
- referencia opcional

### 2.2. Geocodificacao assistida

Foi criada a server action `geocodeStationSeedAddressAction` em `app/postos/cadastrar/actions.ts`.

Comportamento:
- recebe dados basicos do endereco
- usa `geocodeWithNominatim` de `lib/geo/osm.ts`
- retorna lat/lng aproximados, confidence e displayName
- devolve erro orientado quando nao encontra endereco

### 2.3. Preview no mapa com ajuste humano do pin

No form (`components/stations/station-seed-form.tsx`):
- apos geocoding bem-sucedido, o usuario ve preview em mapa (Leaflet)
- pode ajustar o ponto de duas formas:
  - arrastando o pin
  - tocando/clicando no mapa para reposicionar
- ha confirmacao humana explicita: "Confirmar este ponto no mapa"

O submit no modo endereco so libera quando:
- existe coordenada
- local foi confirmado

### 2.4. Regra de confianca e revisao

No `createStationSeedAction`:
- novo `locationMode` (gps/address)
- novo `locationConfirmed`
- novos metadados de geocode: `geocodeConfidence`, `geocodeDisplayName`
- se `geocodeConfidence = low`, o cadastro segue para revisao manual (`manual_review`), mesmo com coordenada

### 2.5. Duplicidade preservada

A prevencao de duplicidade foi mantida e reforcada:
- continua mostrando candidatos parecidos antes de criar
- agora usa as coordenadas ativas (GPS ou geocoding/pin ajustado) para calcular proximidade e score
- mantem necessidade de confirmacao para criar novo quando ha candidatos parecidos

### 2.6. Persistencia e observabilidade do seed

No payload salvo/logado de seed request e eventos, foram incluidos:
- locationMode
- locationConfirmed
- streetNumber
- reference
- geocodeConfidence
- geocodeDisplayName

Isso melhora auditoria e triagem da curadoria.

## 3. Antes / Depois

Antes:
- fluxo focado em GPS/manual
- sem caminho assistido por endereco
- sem preview de mapa com confirmacao humana obrigatoria

Depois:
- cadastro por GPS ou endereco
- geocodificacao assistida no proprio fluxo
- pin ajustavel no mapa e confirmacao obrigatoria do ponto
- baixa confianca automaticamente direcionada para revisao
- duplicidade continua protegida antes da criacao

## 4. Resultado

A semeadura continua mobile-first e leve, mas agora cobre melhor cenarios de campo sem GPS confiavel, mantendo qualidade de localizacao e guardrails de seguranca operacional.
