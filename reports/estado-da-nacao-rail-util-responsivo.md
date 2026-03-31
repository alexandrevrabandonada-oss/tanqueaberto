# Estado da Nação - Rail Útil Responsivo

## Resumo Executivo
O rail útil deixou de ser um bloco pesado no mobile/tablet. As rotas públicas agora exibem apoio curto no eixo principal abaixo de `xl`, e o rail completo só volta no desktop largo. Isso reduz repetição de números, status e CTA no celular e mantém o desktop como suporte lateral real.

## Regra Por Breakpoint

| Breakpoint | Comportamento |
| --- | --- |
| `< md` | Micro-resumo ou apoio curto no conteúdo principal. Rail completo oculto. |
| `md` a `< xl` | Suporte resumido, sem bloco lateral pesado. Sem duplicar números, status ou CTA já visíveis no eixo principal. |
| `xl+` | Rail completo permitido como suporte lateral útil. |

## Antes / Depois Por Rota

### `/`
- Antes: o rail útil já estava contido no desktop e permanecia fora do mobile; o pacote atual manteve isso.
- Depois: continua com micro-resumo no mobile/tablet e rail completo apenas no desktop largo.

### `/atualizacoes`
- Antes: o rail aparecia como bloco lateral pesado em qualquer largura útil.
- Depois: abaixo de `xl`, o feed ganha prioridade e recebe um apoio curto; o rail completo fica escondido.

### `/enviar`
- Antes: o rail competia com o formulário e com a ordem operacional do envio em telas menores.
- Depois: o formulário vira a superfície principal e o rail só reaparece no desktop largo.

### `/hub`
- Antes: a lateral de continuidade ainda podia entrar como coluna pesada fora do desktop.
- Depois: o hub continua guiado pelo bloco principal e o apoio lateral completo fica restrito a `xl+`.

## Componentes Tocados

- [app/atualizacoes/page.tsx](C:/Projetos/Tanque Aberto/app/atualizacoes/page.tsx)
- [app/enviar/page.tsx](C:/Projetos/Tanque Aberto/app/enviar/page.tsx)
- [components/hub/collector-hub.tsx](C:/Projetos/Tanque Aberto/components/hub/collector-hub.tsx)

## Leitura de UX

- Menos repetição entre rail e conteúdo principal.
- Menos texto paralelo em mobile/tablet.
- Mais foco em uma única decisão por vez.
- Sem despejar a versão desktop no celular.

## Validação

- `npm run typecheck` passou.
- `npm run build` passou.
- `npm run verify` passou.

## Estado Final

O rail útil ficou responsivo por breakpoint e passou a seguir a regra: apoio curto fora do desktop largo, suporte lateral completo só em `xl+`.