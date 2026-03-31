# Estado da Nacao - Governanca do CTA Global

Data: 2026-03-27

## Resumo Executivo

- O CTA global deixou de ser uma camada permanente.
- No mobile, ele fica fora do caminho do mapa, do feed, do formulario e da bottom nav.
- No desktop, ele aparece apenas quando a rota realmente ganha com um atalho contextual.
- As rotas `/enviar` e `/hub` ficaram sem CTA global, porque ja sao rotas naturalmente acionaveis.

## Causa Raiz

O CTA amarelo estava usando a mesma logica em quase todas as rotas, com texto generico e presenca fixa. Isso fazia ele competir com o conteudo principal, com a lista e com a navegacao inferior no mobile.

## Matriz de Governanca

| Rota | Mobile < md | Desktop md+ | Estado / contexto | Label | Destino |
| --- | --- | --- | --- | --- | --- |
| `/` | Oculto | Aparece so quando existe recorte ativo | Query, cidade, combustivel, recencia, presenca, densidade ou grupo ativo | `Enviar preco` | `/enviar` |
| `/atualizacoes` | Oculto | Aparece | Feed com ou sem itens, sempre com proximo passo contextual | `Fechar lacunas` ou `Abrir mapa` | `/postos/sem-atualizacao` ou `/` |
| `/enviar` | Oculto | Oculto | Formulario ja e a superficie primaria | N/A | N/A |
| `/hub` | Oculto | Oculto | O proprio hub ja oferece o proximo passo real | N/A | N/A |

## Antes / Depois

### `/`

- Antes: CTA global permanente competia com mapa, lista e com as acoes inline.
- Depois: so aparece no desktop quando existe recorte ativo, com texto contextual e sem ocupar o mobile.

### `/atualizacoes`

- Antes: o CTA repetia a mesma acao generica de envio.
- Depois: o CTA passa a refletir a melhor proxima acao do feed.

### `/enviar`

- Antes: o CTA global podia disputar com o formulario.
- Depois: ficou oculto, porque o formulario ja e o CTA principal.

### `/hub`

- Antes: havia risco de CTA global repetir a logica do proprio hub.
- Depois: o CTA global foi removido da rota e o hub manteve sua propria governanca de continuidade.

## Componentes Tocadas

- [components/layout/global-submit-cta.tsx](C:/Projetos/Tanque%20Aberto/components/layout/global-submit-cta.tsx)
- [components/layout/app-shell.tsx](C:/Projetos/Tanque%20Aberto/components/layout/app-shell.tsx)
- [app/page.tsx](C:/Projetos/Tanque%20Aberto/app/page.tsx)
- [app/atualizacoes/page.tsx](C:/Projetos/Tanque%20Aberto/app/atualizacoes/page.tsx)

## Validacao

- `npm run typecheck` passou
- `npm run build` passou
- `npm run verify` passou

## Regra Final

- Mobile: sem CTA global permanente.
- Desktop: CTA global apenas quando a rota oferece um proximo passo util.
- `/enviar` e `/hub`: sem CTA global.
