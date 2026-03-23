# Estado da Nação — Fila local de envios

## O que foi entregue
- Fila local simples para envios interrompidos ou incompletos, persistida no aparelho.
- Bloco `Envios pendentes` no fluxo de envio, com visão clara de status, recência e presença de foto.
- Ações assistidas para `Tentar agora`, `Revisar antes` e `Descartar`.
- Telemetria para entrada, retomada, conclusão e descarte da fila.

## Como funciona
- A fila vive em `localStorage` com TTL curto de 12 horas.
- Cada tentativa é agrupada por `draftKey`.
- A fila guarda posto, cidade, combustível, preço, estado, metadados da foto e último erro.
- Quando a rede volta, o envio pode ser reaberto diretamente no contexto certo.

## O que ainda é provisório
- Não existe sincronização offline completa.
- Não existe reenvio automático em background.
- A foto continua dependendo do estado local do aparelho e pode precisar ser refeita se o navegador perder a referência.
- A fila é intencionalmente simples e auditável, não um sistema de sincronização.

## Riscos remanescentes
- Limpeza manual do `localStorage` pode apagar rascunhos e pendências.
- Em sessões muito longas, a foto pode expirar antes do reenviar.
- O comportamento varia conforme o navegador mobile e a política de arquivos temporários.

## Validação
- `npm run build`
- `npm run typecheck`
- `npm run lint`
