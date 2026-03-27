# Estado da Nação - Lista Operacional Desktop v2

## Resumo Executivo
A lista desktop agora lê e aciona o posto com menos esforço cognitivo. A borda direita saiu do cinza neutro e passou a mostrar uma ação primária forte por estado, com a ação secundária enxuta e com foco claro no gesto certo.

## Regra De UX

- Nome primeiro.
- Contexto logo abaixo.
- Ação principal destacada por estado.
- Ação secundária mais discreta e consistente.
- Distância e status rebaixados para não competir com o nome.
- Hover, focus e teclado precisam sinalizar melhor o alvo clicável.

## Decisão Por Estado

| Estado | Ação primária | Ação secundária |
| --- | --- | --- |
| Contribuição prioritária | `Foto` com destaque forte | `Traçar rota` como apoio |
| Leitura normal | `Abrir posto` como gesto principal | `Traçar rota` como apoio |

## Antes / Depois

### Antes
- A borda direita parecia um cluster neutro e pouco decisivo.
- Distância e status ainda chamavam atenção demais em comparação com o nome.
- O melhor gesto exigia mais leitura do que deveria.

### Depois
- A ação principal agora é evidente por estado.
- O posto pode ser aberto com menos esforço cognitivo.
- O bloco de ações ganhou contraste, ring de foco e separação visual real.
- A ação secundária ficou mais enxuta e consistente.

## Componentes Tocados

- [components/station/station-card.tsx](C:/Projetos/Tanque%20Aberto/components/station/station-card.tsx)
- [components/ui/quick-action.tsx](C:/Projetos/Tanque%20Aberto/components/ui/quick-action.tsx)

## Validação Visual

- Lista curta: ação principal legível sem ruído lateral.
- Lista longa: repetição não aumenta o peso visual da borda direita.
- Postos com prioridade de contribuição: `Foto` vira o gesto mais óbvio.
- Postos com leitura normal: `Abrir posto` vira o melhor gesto.
- 1440x900: cluster lateral fica mais denso sem ficar cinza.
- 1536x960: a hierarquia continua clara com mais espaço para o conteúdo.

## Validação

- `npm run typecheck` passou.
- `npm run build` passou.
- `npm run verify` passou.

## Estado Final

A lista operacional desktop ficou mais nítida: nome, contexto, ação principal e ação secundária agora têm papéis mais claros, e a borda direita passou a ler como decisão, não como um bloco neutro de controles.