# Estado da Nacao - Busca e Exploracao Real

Data: 2026-03-27

## Objetivo
Endurecer a exploracao publica para que busca, recorte, densidade e topo sticky deixem de ser camada visual e virem ferramenta de decisao.

## Inventario
### Rotas publicas auditadas
- `/`
- `/atualizacoes`
- `/enviar`
- `/hub`

### Superficies classificadas
- `primaria`: busca no topo, mapa vivo, lista do recorte e CTA principal do recorte ativo.
- `secundaria`: filtros de territorio, densidade, rail lateral, atualizacoes recentes.
- `contextual`: estado vazio honesto, memoria do ultimo recorte, persistencia leve, hints operacionais.

## O que entrou neste ajuste
### `/`
- Busca continua cobrindo posto, bairro e cidade via os filtros publicos ja existentes.
- Densidade passou a entrar na URL como `density` e tambem no contexto persistido.
- O ultimo recorte util agora volta com densidade incluida.
- O estado vazio do mapa ficou explicito quando nao ha postos no recorte.
- O botao de limpar agora reseta tambem a densidade para `normal`.
- A URL eh sincronizada com o estado atual sem depender de placeholder stale.

### Classificacao por superficie
- `primaria`: top bar, mapa, lista do recorte.
- `secundaria`: filtros avancados, densidade, rail util.
- `contextual`: empty state, memoria local, retorno ao ultimo posto.

## Antes / Depois por rota
### `/`
- Antes: o topo podia parecer apenas decorativo, com recorte e densidade fora da URL.
- Depois: busca, filtros e densidade viraram estado real de navegacao, com empty state honesto e retorno leve do ultimo recorte.

### `/atualizacoes`
- Auditada neste pacote, sem mudanca nesta passada.

### `/enviar`
- Auditada neste pacote, sem mudanca nesta passada.

### `/hub`
- Auditada neste pacote, sem mudanca nesta passada.

## Diff focado
Arquivos tocados neste ajuste:
- [app/page.tsx](C:/Projetos/Tanque%20Aberto/app/page.tsx)
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)
- [components/ui/density-selector.tsx](C:/Projetos/Tanque%20Aberto/components/ui/density-selector.tsx)
- [lib/navigation/home-context.ts](C:/Projetos/Tanque%20Aberto/lib/navigation/home-context.ts)

### Resumo do diff
- `app/page.tsx`: le a densidade da URL e repassa para a home.
- `components/home/home-browser.tsx`: sincroniza URL, persiste densidade, aplica empty state, e limpa densidade ao resetar filtros.
- `components/ui/density-selector.tsx`: usa o tipo compartilhado de densidade.
- `lib/navigation/home-context.ts`: armazena densidade no contexto do ultimo recorte.

## Checklist visual
- [x] Busca identifica posto, bairro e cidade
- [x] Limpar filtros zera busca, territorio, recencia, presenca e densidade
- [x] URL reflete o recorte atual
- [x] Persistencia leve guarda o ultimo recorte util
- [x] Empty state nao mente quando nao ha resultado
- [x] Mobile permanece intacto
- [x] Wide desktop continua legivel
- [x] Topo nao ganhou placa pesada

## Validacao
- `npm run build`: passou
- `npm run typecheck`: falhou por problema estrutural do repo, com arquivos faltando em `.next/types/**` que nao foram gerados nesta sessao

## Recomendacao objetiva
Deploy agora este pacote da home publica.
Ele melhora decisao real sem mexer em admin nem tooling de release.

## Estado da Nacao
O pacote saiu de "exploracao visual" para "exploracao util".
O que estava faltando era amarrar o estado da interface ao estado da URL e do armazenamento local, sem deixar o topo virar um painel redundante.
