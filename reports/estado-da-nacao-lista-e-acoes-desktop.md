# Estado da Nação - Lista e Acoes Desktop

## Resumo executivo
A lista de postos do desktop deixou de tratar clique, status e ações como elementos equivalentes. Agora a row inteira abre o posto, o CTA contextual muda conforme o estado operacional do posto, e a borda direita perdeu a sensação de cluster cinza/confuso.

## O que mudou
- O card de posto passou a ser clicavel inteiro para abrir o posto.
- A lista do recorte no desktop saiu do modelo de link com botoes redundantes e virou uma superficie com overlay de navegaçao e cluster de acoes separado.
- O CTA contextual agora muda de prioridade conforme o estado do posto:
  - prioridade de contribuicao: foto primeiro, rota depois
  - posto com estado normal: rota primeiro, foto depois
- Os botoes ficaram mais legiveis no desktop: contraste maior, borda mais solida e labels desktop menos apagadas.
- Distancia e status foram rebaixados para nao competir com o nome.

## Rationale de UX
A leitura operacional rapida precisava de uma hierarquia mais nitida:
- nome do posto como âncora visual
- clique no card como decisao principal
- uma acao contextual real na area direita
- uma acao secundaria de apoio
- distancia e recencia como suporte, nao como bloco dominante

Isso reduz o ruído na borda direita e melhora a escaneabilidade em listas curtas e longas.

## Antes e depois
### Lista do recorte no desktop
- Antes: row clicavel + 3 botoes dentro da mesma superficie, com acoes redundantes e pouco contraste.
- Depois: row clicavel inteira, 2 acoes reais e ordem mudando conforme a necessidade operacional do posto.

### Station card
- Antes: card era somente um container com acoes internas e sem clique global.
- Depois: card inteiro abre o posto, mantendo acoes de apoio acima do plano de fundo.

### Botoes
- Antes: secundaria e outline podiam parecer desativados quando o layout ficava mais denso.
- Depois: fundos e labels ficaram mais fortes, com menos aparência de estado morto.

## Componentes tocados
- [components/station/station-card.tsx](C:/Projetos/Tanque%20Aberto/components/station/station-card.tsx)
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)
- [components/ui/quick-action.tsx](C:/Projetos/Tanque%20Aberto/components/ui/quick-action.tsx)

## Validaçao
- `npm run typecheck`: passou na rerun apos o build gerar os artefatos esperados
- `npm run build`: passou
- `npm run verify`: passou

## Checklist visual
- [x] Card inteiro abre o posto
- [x] Acao contextual vem antes da acao secundaria quando ha prioridade de contribuicao
- [x] Distancia nao compete com o nome
- [x] Status nao domina a leitura
- [x] Botao ativo nao parece desabilitado
- [x] Desktop 1440 e 1536 preservados
- [x] Lista curta e lista longa continuam legiveis
- [x] Sem mexer em admin, beta ou tooling de release

## Recomendacao
Deploy deste pacote agora.
