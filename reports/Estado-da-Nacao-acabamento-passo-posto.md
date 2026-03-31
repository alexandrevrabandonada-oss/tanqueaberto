# Estado da Nacao: acabamento do passo do posto

## Diagnostico curto
O passo do posto ainda estava funcional, mas a leitura visual e textual misturava sinais proximos demais:
- confianca de geo com labels longos
- posto parecido e criacao de novo com peso visual parecido
- resumo final com texto mais tecnico do que operacional

## O que foi ajustado
### No picker de posto
- Labels de geo encurtadas para `Sem geo`, `Geo em revisao` e `Geo ok`.
- O posto passou a mostrar o chip de origem com mais clareza:
  - `GPS`
  - `Usado antes`
  - `Busca`
  - `Cidade`
  - `Ranqueado`
- O item ambiguo ficou mais curto e menos ansioso.
- O fluxo de posto novo ficou mais direto:
  - `Se nao achou, crie so o basico.`
  - `Parecidos antes de criar`
  - `Criar novo posto`
  - `Escolher parecido`

### No resumo do formulario
- O resumo do posto ficou mais curto:
  - `Mais provavel`
  - `Sugerido`
  - `Guia`
- O resumo de GPS ficou mais simples:
  - `Sem GPS`
  - `Com GPS`
  - `Livre`

## Antes / Depois
- Antes: `Sem local confiavel`, `Local em revisao`, `Rever local`
- Depois: `Sem geo`, `Geo em revisao`, `Geo ok`

- Antes: `Nome parecido` / `Confirmar local`
- Depois: `Parecido` / `Geo em revisao`

- Antes: `Se nao achou o posto, digite so o basico.`
- Depois: `Se nao achou, crie so o basico.`

- Antes: `Criar este posto` / `Voltar para a busca`
- Depois: `Criar novo posto` / `Escolher parecido`

- Antes: `E este posto?` / `Trocar`
- Depois: `Tem parecido?` / `Seguir com este` / `Trocar por parecido`

## Validacao
- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou

## Leitura operacional
A escolha do posto ficou mais rapida de bater o olho, com menos ruido entre:
- sugestao confiavel
- posto recente
- posto parecido
- posto novo

A prevenao de duplicidade e o ranking foram preservados.
