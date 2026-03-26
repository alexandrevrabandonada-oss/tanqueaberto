# Estado da Nação — Explorer Toolbar Desktop

Data: 2026-03-26

## Veredito

OK para desktop e wide. A barra de exploração deixou de funcionar como placa grande sobre o mapa/lista e passou a operar como toolbar compacta com secundário colapsado por padrão.

## Antes / Depois

- Antes: busca + chips + modos + densidade ficavam sempre expostos em mais de uma linha, com cara de overlay pesado.
- Depois: a exploração ficou em duas camadas reais.
- Linha 1: busca.
- Linha 2: território + estado crítico + acionador de extras.
- Secundário: cidades prioritárias, missão, eco e densidade só quando o usuário abre.

## Budgets finais

- `expanded`: `112px` normal, `100px` wide.
- `sticky`: `76px` normal, `68px` wide.
- `micro`: `54px` normal, `48px` wide.

## Arquivos tocados

- [components/layout/top-orchestrator.tsx](C:/Projetos/Tanque%20Aberto/components/layout/top-orchestrator.tsx)
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)

## Efeito prático

- A toolbar cobre menos mapa e menos lista no desktop.
- O estado crítico continua visível o tempo todo.
- O modo de leitura foi empurrado para expand/collapse, reduzindo ruído.
- A home entra em sticky e micro mais cedo em tela larga.

## Validação

- `npm run build` passou.
- Restam apenas warnings antigos de hooks e o aviso conhecido do `/hub` dinâmico.
