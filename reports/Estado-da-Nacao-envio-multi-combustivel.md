# Estado da Nação: envio multi-combustível

## Diagnóstico curto

O fluxo de envio estava otimizado para um único combustível por submissão, enquanto a evidência real quase sempre chega como uma foto com vários preços do mesmo posto. Isso gerava fricção desnecessária, duplicava passos e empurrava a pessoa para múltiplos envios quando o contexto já era compartilhado.

## O que foi alterado

### Fluxo guiado
- Mantive a navegação guiada em 4 etapas: foto, posto, preços e revisão.
- A etapa antiga de combustível/preço foi substituída por um bloco único com 6 linhas opcionais:
  - gasolina comum
  - gasolina aditivada
  - etanol
  - diesel S10
  - diesel comum
  - GNV
- Cada linha aceita preço opcional, então a pessoa pode enviar 1 ou vários combustíveis sem mudar de fluxo.
- O CTA e o texto de apoio agora deixam explícito:
  - preencha só os preços que aparecem na foto
  - pode enviar 1 ou vários

### Draft, fila local e retry
- O draft local agora salva um mapa `fuelPrices` por combustível.
- A fila local passou a carregar e reprocessar o pacote inteiro, preservando `fuelPrices` e um combustível primário apenas para compatibilidade.
- O retry offline agora reenfileira `priceEntriesJson` e não perde os demais preços do pacote.

### Revisão final e pós-envio
- A revisão final agora mostra:
  - posto
  - status da foto/origem
  - lista completa dos preços preenchidos
- A ponte pós-envio agora resume o pacote enviado com todos os combustíveis preenchidos, em vez de mostrar só um item.

### Backend e dados
- O backend agora aceita `priceEntriesJson` e trata o envio como um pacote.
- A foto sobe uma única vez e o contexto compartilhado é reaproveitado.
- Cada combustível continua virando um `price_report` separado, preservando rastreabilidade por combustível nas superfícies já existentes.
- O pacote compartilha no `metadata`:
  - `package_id`
  - `package_size`
  - combustível/preço primário
  - mapa de preços do pacote
  - flag de foto compartilhada
- A action retorna `reportIds`, `submittedReports` e `packageId` para o cliente.

### Moderação e confiança
- A avaliação de risco e o roteamento continuam por combustível.
- O pacote compartilha foto, posto e contexto do envio.
- Divergência forte ainda pode sinalizar um combustível específico sem perder o vínculo com o pacote.

## Antes / Depois

### Antes
- 1 foto
- 1 posto
- 1 combustível por envio
- repetir a etapa para cada preço visto no totem
- revisão final mostrava só 1 combustível e 1 preço
- retry offline era centrado em um único item

### Depois
- 1 foto
- 1 posto
- 1 ou vários combustíveis no mesmo envio
- uma etapa única de preços opcionais e mobile-first
- revisão final mostra o pacote inteiro
- retry offline e pós-envio entendem múltiplos preços
- superfícies públicas continuam funcionando porque cada combustível ainda entra como `price_report`

## Arquivos principais
- `app/enviar/actions.ts`
- `components/forms/price-submit-form.tsx`
- `components/forms/post-submission-bridge.tsx`
- `components/routes/queue-assistant.tsx`
- `components/forms/submission-queue-panel.tsx`
- `lib/queue/submission-queue.ts`
- `lib/drafts/submission-draft.ts`
- `lib/submissions/fuel-prices.ts`

## Validação executada
- `npm run typecheck` ✅
- `npm run build` ✅
- `npm run verify` ✅

## Observações
- O `verify` passou, mas o projeto continua emitindo warnings já existentes de `img` e dois warnings de dependências de `useEffect` no `price-submit-form.tsx`.
- Não alterei arquivos fora do escopo do envio multi-combustível.
