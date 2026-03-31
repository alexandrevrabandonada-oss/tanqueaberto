# Estado da Nação - Hub Largo 5.0

Data: 2026-03-25

## Resumo

O `Meu Hub` deixou de depender de um hero único e passou a funcionar como uma central operacional de continuidade em telas largas. A estrutura agora distribui o espaço em módulos úteis para:

- próximo passo
- fila local / inbox
- missão ativa
- sessão recente
- impacto territorial
- memória curta / reforço de prova

O foco foi manter a clareza de iniciante no mobile e, ao mesmo tempo, usar desktop e tablet como superfícies realmente densas e intencionais.

## O Que Mudou

### Estrutura principal

- [app/hub/page.tsx](C:/Projetos/Tanque%20Aberto/app/hub/page.tsx)
  - adiciona a moldura do Hub largo com intro textual e chips de estado
  - expõe `data-layout-scope="hub-wide"` na página

- [components/hub/collector-hub.tsx](C:/Projetos/Tanque%20Aberto/components/hub/collector-hub.tsx)
  - cria o bloco principal do Hub largo
  - adiciona o topo operacional com:
    - próximo passo
    - fila local
    - impacto
  - reorganiza a composição em zonas:
    - área principal
    - sessão recente
    - rail lateral
  - mantém a hero de ativação para estado zero, mas sem dominar telas largas
  - marca o corpo principal com `data-layout-role="main"` para captura e telemetria

### Captura e validação

- [scripts/capture-hub-largo.cjs](C:/Projetos/Tanque%20Aberto/scripts/capture-hub-largo.cjs)
  - gera screenshots em mobile, tablet e desktop
  - grava inventário em `reports/hub-largo-5-0/metrics.json`

## Screenshots

Gerados em:

- [reports/hub-largo-5-0/hub-mobile.png](C:/Projetos/Tanque%20Aberto/reports/hub-largo-5-0/hub-mobile.png)
- [reports/hub-largo-5-0/hub-tablet.png](C:/Projetos/Tanque%20Aberto/reports/hub-largo-5-0/hub-tablet.png)
- [reports/hub-largo-5-0/hub-desktop.png](C:/Projetos/Tanque%20Aberto/reports/hub-largo-5-0/hub-desktop.png)

Inventário da captura:

- [reports/hub-largo-5-0/metrics.json](C:/Projetos/Tanque%20Aberto/reports/hub-largo-5-0/metrics.json)

## Leitura Visual

### Desktop

- o Hub passa a parecer uma central operacional
- o bloco superior deixa explícita a função do espaço
- os módulos de próximo passo, fila e impacto ocupam a largura com intenção
- a lateral passa a ser apoio contextual, não ruído

### Tablet

- a composição continua legível sem virar mobile esticado
- o bloco zero / iniciante fica claro sem dominar todo o espaço
- a hierarquia do conteúdo se mantém estável

### Mobile

- a estrutura continua compreensível
- o sistema não foi desmontado para caber
- a lógica de continuidade permanece compatível com navegação rápida

## Validação

- `npm run build` passou após a última alteração
- os screenshots foram produzidos com o build atual
- a página do Hub permanece dinâmica no servidor por depender de dados/cookies em tempo de renderização, o que gera os avisos já conhecidos do projeto, mas não bloqueou a entrega visual

## Pendências

- o inventário automático de métricas em `metrics.json` serve como referência de captura, mas a telemetria de layout ainda pode ser refinada se for desejado medir:
  - clique no próximo passo
  - retorno ao Hub
  - uso de inbox/fila
  - conversão do Hub em envio real
- se você quiser, o próximo passo natural é transformar esses módulos em medição de produto mais dura, com eventos específicos por ação

## Estado Final

O Hub agora está mais perto de uma central de continuidade do que de um hero decorativo. Em desktop e tablet, a largura extra passou a ser usada para organizar fluxo, contexto e ação. No mobile, a leitura continua simples e direta.
