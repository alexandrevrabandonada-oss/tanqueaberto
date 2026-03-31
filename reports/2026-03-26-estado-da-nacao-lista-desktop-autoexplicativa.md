# Estado da Nação — Lista Desktop Autoexplicativa

## Objetivo
Deixar as ações por linha mais autoexplicativas em desktop, sem poluir o mobile.

## Racional da hierarquia
- Ação principal: ganha o texto mais explícito e maior prioridade visual.
- Ações secundárias: continuam presentes, mas com peso menor.
- Desktop: recebe rótulo de apoio persistente para reduzir adivinhação.
- Mobile: continua compacto, com a mesma ordem de ações.

## Antes
- A linha dependia muito de ícones.
- O significado das ações exigia familiaridade prévia com o produto.
- Em desktop havia espaço, mas a semântica não era explícita.

## Depois
- O componente base de ação curta passou a aceitar `desktopLabel`.
- As linhas de posto, mapa e lacunas exibem texto de apoio em desktop.
- A lista do recorte ganhou labels explícitos para `Foto`, `Rota` e `Ver`.
- O botão principal continua primeiro na ordem visual e semântica.

## Arquivos alterados
- [components/ui/quick-action.tsx](C:/Projetos/Tanque%20Aberto/components/ui/quick-action.tsx)
- [components/station/station-card.tsx](C:/Projetos/Tanque%20Aberto/components/station/station-card.tsx)
- [components/map/station-map.tsx](C:/Projetos/Tanque%20Aberto/components/map/station-map.tsx)
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)
- [app/grupo/[slug]/page.tsx](C:/Projetos/Tanque%20Aberto/app/grupo/[slug]/page.tsx)
- [app/postos/sem-atualizacao/page.tsx](C:/Projetos/Tanque%20Aberto/app/postos/sem-atualizacao/page.tsx)

## Validação
- `npm run build` passou.
- Restaram apenas warnings antigos de hooks e o aviso conhecido do `/hub` dinâmico.

## Observação
- Não gerei screenshots novas nesta sessão porque o ambiente ainda não oferece captura visual estável.

