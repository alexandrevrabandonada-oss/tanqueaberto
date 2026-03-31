# Estado da Nação — Hub Continuação Real

## Resumo Executivo
O `/hub` agora responde primeiro ao que importa de verdade: o que foi feito por último, o que está pendente e qual é o próximo gesto útil.

A superfície acima da dobra foi enxugada para evitar competição entre shell global, hero da rota e CTA principal. Quando existe estado operacional real, o hub entra direto na continuidade. O hero de onboarding só domina quando a pessoa está de fato zerada.

## O Que Mudei
- O shell global de envio deixou de disputar atenção no `/hub`.
- O topo da página foi reduzido para uma introdução curta e neutra.
- O `CollectorHub` passou a organizar o conteúdo em uma sequência clara:
  1. próximo melhor gesto
  2. sessão recente
  3. fila e moderação
  4. impacto acumulado
  5. memória e atalhos
- O rail lateral ficou só com prova de vida contextual.
- O `/hub` foi marcado como `force-dynamic` para evitar ruído de prerender/cookies durante build.

## Classificação Das Superfícies
### `/hub`
- Primária: cartão de próximo melhor gesto com um único CTA principal.
- Secundária: sessão recente, fila/moderação, impacto acumulado e memória/atalhos.
- Contextual: rail lateral com prova de vida territorial.

### `/`
- Não mexido neste pacote.

### `/atualizacoes`
- Não mexido neste pacote.

### `/enviar`
- Não mexido neste pacote.

## Antes / Depois
### Antes
- Hero da rota competia com o shell global.
- O `CollectorHub` mostrava um hero grande + agenda + ciclo + missão + cards laterais.
- O rail repetia sinais que já estavam no corpo principal.
- O peso visual favorecia onboarding, não continuidade.

### Depois
- Há uma única superfície primária acima da dobra quando o usuário já tem estado operacional.
- O CTA global do shell não aparece no `/hub`.
- A continuidade aparece em blocos reais e na ordem certa.
- O hero de onboarding fica reservado ao estado realmente vazio.
- O rail ficou útil sem duplicar o que o corpo já mostra.

## Componentes Tocadas
- [app/hub/page.tsx](C:/Projetos/Tanque%20Aberto/app/hub/page.tsx)
- [components/hub/collector-hub.tsx](C:/Projetos/Tanque%20Aberto/components/hub/collector-hub.tsx)
- [components/layout/app-shell.tsx](C:/Projetos/Tanque%20Aberto/components/layout/app-shell.tsx)

## Helpers Auditados E Reutilizados
- `components/hub/submission-status.tsx`
- `components/hub/hub-recents.tsx`
- `components/hub/reputation-badge.tsx`
- `components/hub/territorial-impact-card.tsx`
- `components/hub/proof-of-life-reforcement.tsx`
- `app/hub/actions.ts`
- `lib/queue/submission-queue.ts`
- `lib/ops/collector-trust.ts`
- `lib/ops/recorte-activity.ts`

## Verificação
- `npm run typecheck` passou.
- `npm run build` passou.
- Restaram apenas warnings antigos de hooks em arquivos fora deste pacote.

## Recomendação Objetiva
Deploy agora este pacote do `/hub`.

Motivo: ele está limitado, usa dados reais já existentes, reduz competição de superfície e não mexe em admin, beta nem tooling de release.
