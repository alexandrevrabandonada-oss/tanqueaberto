# Estado da Nação — Pacote Desktop Experience

Data: 2026-03-26

## Objetivo
Isolar um pacote pequeno e seguro para a frente desktop do Bomba Aberta, sem misturar admin, curadoria ou tooling experimental.

## Inventário Do Worktree
### Modificados
- [.gitignore](C:/Projetos/Tanque%20Aberto/.gitignore)
- [app/atualizacoes/page.tsx](C:/Projetos/Tanque%20Aberto/app/atualizacoes/page.tsx)
- [app/enviar/page.tsx](C:/Projetos/Tanque%20Aberto/app/enviar/page.tsx)
- [app/grupo/[slug]/page.tsx](C:/Projetos/Tanque%20Aberto/app/grupo/[slug]/page.tsx)
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)
- [components/hub/collector-hub.tsx](C:/Projetos/Tanque%20Aberto/components/hub/collector-hub.tsx)
- [components/map/station-map.tsx](C:/Projetos/Tanque%20Aberto/components/map/station-map.tsx)
- [components/station/station-card.tsx](C:/Projetos/Tanque%20Aberto/components/station/station-card.tsx)
- [components/ui/quick-action.tsx](C:/Projetos/Tanque%20Aberto/components/ui/quick-action.tsx)
- [scripts/release-gate-preview-real.cjs](C:/Projetos/Tanque%20Aberto/scripts/release-gate-preview-real.cjs)

### Não versionados
- Há vários relatórios antigos e artefatos de execução em `reports/`, incluindo `reports/release-gate-preview-real/`.
- Esses arquivos são histórico e diagnóstico, não entram no deploy.

### Sinal do estado atual
- `git status` mostra 10 arquivos modificados e um conjunto de relatórios soltos.
- `npm run typecheck` passou nesta sessão.

## Separação Do Pacote
### Navegação Desktop
- [components/ui/quick-action.tsx](C:/Projetos/Tanque%20Aberto/components/ui/quick-action.tsx#L10) passa a aceitar `desktopLabel` e `secondaryLabel`.
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx#L1440) aplica labels de desktop nos quick actions da lista.
- [components/map/station-map.tsx](C:/Projetos/Tanque%20Aberto/components/map/station-map.tsx#L235) aplica os mesmos rótulos nas ações do mapa.
- [components/station/station-card.tsx](C:/Projetos/Tanque%20Aberto/components/station/station-card.tsx#L181) alinha a semântica das ações por posto.
- [app/grupo/[slug]/page.tsx](C:/Projetos/Tanque%20Aberto/app/grupo/[slug]/page.tsx#L236) ganha label específico de missão.

### Explorer Toolbar
- O componente base ficou mais explícito em telas largas.
- A toolbar do mapa e da lista passam a expor `Abrir câmera`, `Traçar rota` e `Abrir posto`.
- A intenção é reduzir dependência de ícone e adivinhação no desktop.

### Rail Útil
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx#L1333) reorganiza o rail do mapa com recorte, prioridade e próxima ação.
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx#L1365) destaca postos sem preço recente como prioridade.
- [app/enviar/page.tsx](C:/Projetos/Tanque%20Aberto/app/enviar/page.tsx#L112) adiciona rail com ordem do fluxo, fila e posto escolhido.
- [app/atualizacoes/page.tsx](C:/Projetos/Tanque%20Aberto/app/atualizacoes/page.tsx#L35) adiciona rail com leitura do feed e ação recomendada.
- [components/hub/collector-hub.tsx](C:/Projetos/Tanque%20Aberto/components/hub/collector-hub.tsx#L217) adiciona rail de sessão, fila e missão.

### Lista Desktop
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx#L1593) reforça a lista de postos sem atualização.
- O objetivo é manter a lista como instrumento de decisão, não como timeline genérica.

### Gate Real
- [scripts/release-gate-preview-real.cjs](C:/Projetos/Tanque%20Aberto/scripts/release-gate-preview-real.cjs#L145) aceita `--preview-url` e `--url`.
- [scripts/release-gate-preview-real.cjs](C:/Projetos/Tanque%20Aberto/scripts/release-gate-preview-real.cjs#L160) cria proxy local para o preview publicado.
- [scripts/release-gate-preview-real.cjs](C:/Projetos/Tanque%20Aberto/scripts/release-gate-preview-real.cjs#L252) envia header de bypass quando existir token de proteção.
- [scripts/release-gate-preview-real.cjs](C:/Projetos/Tanque%20Aberto/scripts/release-gate-preview-real.cjs#L466) atualiza a observação do relatório do gate.
- [.gitignore](C:/Projetos/Tanque%20Aberto/.gitignore) passa a ignorar `.vercel`.

## O Que Entra Neste Deploy
- Desktop labels e affordances de ações curtas.
- Rail útil no mapa, envio, atualizações e hub de coleta.
- Lista desktop mais explícita.
- Ajustes de cópia que deixam o próximo gesto claro.

## O Que Fica Fora
- [app/admin/**](C:/Projetos/Tanque%20Aberto/app/admin/) inteiro.
- [app/auditoria/**](C:/Projetos/Tanque%20Aberto/app/auditoria/) inteiro.
- [app/beta/**](C:/Projetos/Tanque%20Aberto/app/beta/) inteiro.
- [app/api/**](C:/Projetos/Tanque%20Aberto/app/api/) inteiro.
- Scripts que não são o gate real, como rotinas de importação, auditoria e curadoria.
- Relatórios antigos e artefatos em `reports/`.

## Proposta De Commits
### Commit 1
`feat(desktop): explicitar quick actions no desktop`

Escopo:
- [components/ui/quick-action.tsx](C:/Projetos/Tanque%20Aberto/components/ui/quick-action.tsx)
- [components/map/station-map.tsx](C:/Projetos/Tanque%20Aberto/components/map/station-map.tsx)
- [components/station/station-card.tsx](C:/Projetos/Tanque%20Aberto/components/station/station-card.tsx)
- [app/grupo/[slug]/page.tsx](C:/Projetos/Tanque%20Aberto/app/grupo/[slug]/page.tsx)

### Commit 2
`feat(desktop): reorganizar rail e lista do recorte`

Escopo:
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)
- [app/enviar/page.tsx](C:/Projetos/Tanque%20Aberto/app/enviar/page.tsx)
- [app/atualizacoes/page.tsx](C:/Projetos/Tanque%20Aberto/app/atualizacoes/page.tsx)
- [components/hub/collector-hub.tsx](C:/Projetos/Tanque%20Aberto/components/hub/collector-hub.tsx)

### Commit 3
`chore(release): endurecer preview-real gate`

Escopo:
- [scripts/release-gate-preview-real.cjs](C:/Projetos/Tanque%20Aberto/scripts/release-gate-preview-real.cjs)
- [.gitignore](C:/Projetos/Tanque%20Aberto/.gitignore)

## Ordem De Merge
1. Merge do Commit 1.
2. Merge do Commit 2.
3. Validar desktop wide, rail e lista.
4. Só depois merge do Commit 3.

## Checklist Final De Release
- `git status` limpo fora dos arquivos do pacote.
- `npm run typecheck` verde.
- `npm run lint` verde.
- `npm run build` verde.
- Validação visual em 1440px e 1536px.
- Verificar se quick actions mostram o label desktop correto.
- Verificar se o rail útil não compete com o conteúdo principal.
- Verificar se o gate real ainda resolve preview protegido com `--preview-url`.
- Confirmar que nada de admin, curadoria ou beta entrou no diff.

## Recomendação Objetiva
Eu deployaria agora apenas o pacote de experiência desktop dos commits 1 e 2.

O `gate real` deve ficar em merge separado, porque é tooling de release e aumenta o raio de risco sem mudar a experiência do usuário. Se a intenção for um corte ainda mais conservador, deixe também `.gitignore` para o mesmo merge do gate.

## Veredito
Pacote viável, contido e com bom acoplamento interno. O próximo deploy deve priorizar a frente desktop do produto e deixar a infraestrutura de release em fila separada.

