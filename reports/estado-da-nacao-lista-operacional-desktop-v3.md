# Estado da Nacao - Lista Operacional Desktop v3

## Resumo Executivo
A lista operacional desktop ficou visualmente estável nos widths reais de uso. O ponto que estava enfraquecendo a leitura do recorte em desktop era o desktop label do botao primario em fundo claro: ele herdava contraste fraco e parecia sumir. A correccao foi pontual, sem mexer em admin, beta ou no desenho geral da lista.

## Auditoria

### `station-card`
- O estado sem preco recente continua lendo como convite para contribuicao, com o card explicando a ausencia de atualizacao e mantendo a acao primaria visivel.
- O estado de leitura normal segue com `Abrir posto` como acao principal e `Traçar rota` como secundária.
- Nome, contexto e valor continuam acima do cluster de acoes.

### `quick-action`
- O problema real estava no desktop label dos botoes primarios em fundo claro.
- Antes, o recorte desktop deixava o botao primario quase mudo visualmente.
- Depois, o label secundario do botao primario/accento ganhou contraste escuro, sem alterar tamanho, grid ou ordem das acoes.

### `lista do recorte`
- A hierarquia ficou clara por estado.
- O botao primario agora aparece com texto legivel no desktop narrow e wide.
- O secundario continua secundario, sem competir com a acao principal.

## Regra Aplicada
- Estado sem preco recente: uma superficie primaria, um CTA principal, sem duplicacao de CTA.
- Estado com atividade: continuidade primeiro, onboarding recuado.
- Desktop: sem bloquear leitura do posto, sem perder prioridade da acao principal.

## Antes / Depois

### Antes
- O botao primario do recorte desktop ficava com label muito fraco sobre fundo claro.
- Em widths entre 1280 e 1600, a acao parecia mais um bloco vazio do que um alvo claro.
- A hierarquia do cluster de acoes ficava instavel em relacao ao texto do card.

### Depois
- O label desktop do botao primario/accento ficou legivel em fundo claro.
- O cluster de acoes manteve largura e ordem, sem clipping horizontal.
- O secundario continuou discreto e legivel.
- Nenhuma regressao foi introduzida em `station-card` ou na lista do recorte.

## Diff Focado
- [components/ui/quick-action.tsx](C:/Projetos/Tanque%20Aberto/components/ui/quick-action.tsx)

## Evidencia Por Width
Capturas geradas em:
- [reports/estado-da-nacao-lista-operacional-desktop-v3-evidence/summary.json](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-lista-operacional-desktop-v3-evidence/summary.json)

| Width | Sem preco recente | Leitura normal | Prioridade de contribuicao |
| --- | --- | --- | --- |
| 1280 | [PNG](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-lista-operacional-desktop-v3-evidence/1280/no-recent.png) | [PNG](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-lista-operacional-desktop-v3-evidence/1280/normal.png) | [PNG](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-lista-operacional-desktop-v3-evidence/1280/recorte.png) |
| 1366 | [PNG](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-lista-operacional-desktop-v3-evidence/1366/no-recent.png) | [PNG](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-lista-operacional-desktop-v3-evidence/1366/normal.png) | [PNG](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-lista-operacional-desktop-v3-evidence/1366/recorte.png) |
| 1440 | [PNG](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-lista-operacional-desktop-v3-evidence/1440/no-recent.png) | [PNG](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-lista-operacional-desktop-v3-evidence/1440/normal.png) | [PNG](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-lista-operacional-desktop-v3-evidence/1440/recorte.png) |
| 1536 | [PNG](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-lista-operacional-desktop-v3-evidence/1536/no-recent.png) | [PNG](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-lista-operacional-desktop-v3-evidence/1536/normal.png) | [PNG](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-lista-operacional-desktop-v3-evidence/1536/recorte.png) |
| 1600 | [PNG](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-lista-operacional-desktop-v3-evidence/1600/no-recent.png) | [PNG](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-lista-operacional-desktop-v3-evidence/1600/normal.png) | [PNG](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-lista-operacional-desktop-v3-evidence/1600/recorte.png) |

## Validacao
- `npm run typecheck` passou.
- `npm run build` passou.
- `npm run verify` passou.
- Os warnings de hooks em `price-submit-form.tsx`, `home-browser.tsx` e `retention-hub.tsx` continuam os mesmos e nao vieram desta passada.

## Estado Final
A lista operacional desktop ficou mais confiavel: o cluster de acoes agora sustenta a hierarquia esperada por estado em widths reais de uso, sem clipping, sem perda de prioridade e sem o botao primario do recorte virar ruido visual.
