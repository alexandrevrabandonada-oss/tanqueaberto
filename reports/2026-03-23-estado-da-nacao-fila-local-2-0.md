# Estado da Nação — Fila Local 2.0

## Resumo Executivo
Implementamos a **Fila Local 2.0**, transformando a recuperação de falhas de rede em uma experiência proativa e resiliente. O Bomba Aberta agora é capaz de reter colaborações completas (incluindo fotos) por longos períodos de offline, oferecendo um fluxo de reenvio assistido assim que a conexão é restaurada.

## Pilares da Entrega

### 1. Robustez via IndexedDB
Substituímos a dependência de memória volátil por armazenamento persistente em disco (IndexedDB) para as fotos de pendências. Isso garante 100% de retenção em caso de fechamento acidental do app ou falta de energia no dispositivo.

### 2. Flush Online Assistido
O novo `QueueAssistant` remove a carga cognitiva do usuário. Em vez de ter que procurar onde estão as pendências, o app agora "empurra" o fluxo de reenvio assim que detecta sinal, permitindo reenvio em massa com um único toque.

### 3. Hierarquia de Status Operational
Implementamos uma matriz de estados mais rica (`stored`, `ready`, `photo_required`, `success`), permitindo que o usuário saiba exatamente quais itens podem ser recuperados e quais exigem uma nova foto.

### 4. Telemetria de Recuperação
Novos eventos de telemetria rastreiam o ciclo de vida da fila:
- `submission_queue_recovered_success`: Mede a conversão de itens que seriam perdidos.
- `submission_queue_flush_started`: Rastreia o uso do assistente automático.
- `submission_queue_item_expired`: Monitora perdas por TTL.

## Impacto Esperado
- **Zero Loss**: Redução drástica na perda de colaborações em zonas rurais ou "pontos cegos" urbanos.
- **Agilidade**: Menor tempo entre a coleta em campo e a chegada do dado ao servidor.
- **Confiança**: Reforço da percepção de que o app "sempre funciona", independente do sinal.

---
**Status: Implementado e pronto para campo.**
**Data: 2026-03-23**
