# Estado da Nacao: enviar miolo splitado

## Resumo executivo

A rota `/enviar` ja estava com shell server-first, mas o miolo do formulario ainda concentrava duas partes pesadas no caminho quente: o picker de posto e a revisao final. Esta passada quebrou essas duas partes em chunks tardios, mantendo foto, casca inicial e progressao guiada no caminho critico.

Resultado pratico:
- a etapa inicial ficou mais leve;
- o picker de posto so entra quando precisa;
- a revisao final so entra na confirmacao;
- o fluxo guiado e a revisao final continuam intactos.

## Diagnostico curto

O gargalo restante nao estava mais na rota em si, e sim dentro do `price-submit-form`:
- o picker de posto carregava muita logica e renderizacao cedo demais;
- a revisao final estava no mesmo bloco quente do formulario;
- havia trabalho client desnecessario antes da etapa atual.

## O que foi separado

- [`components/forms/price-submit-form.tsx`](C:/Projetos/Tanque%20Aberto/components/forms/price-submit-form.tsx)
- [`components/forms/price-submit-station-picker.tsx`](C:/Projetos/Tanque%20Aberto/components/forms/price-submit-station-picker.tsx)
- [`components/forms/price-submit-review.tsx`](C:/Projetos/Tanque%20Aberto/components/forms/price-submit-review.tsx)

## Antes e depois

### Rota `/enviar`

- antes: `19.9 kB` de route size e `159 kB` de First Load JS
- depois: `1.87 kB` de route size e `132 kB` de First Load JS

### Miolo do formulario

- antes: picker de posto e revisao final estavam no mesmo caminho quente do `price-submit-form`
- depois: esses blocos viraram chunks tardios independentes

### Chunks internos agora separados

- `price-submit-station-picker`: `19,985` bytes
- `price-submit-review`: `2,230` bytes

### Impacto direto no caminho quente

- aproximadamente `22.215 kB` sairam do bloco quente do formulario
- o `price-submit-form` ficou com o miolo critico que realmente precisa existir cedo

## Logica aplicada

- foto continua no caminho critico;
- casca inicial continua pequena;
- picker de posto entra tarde;
- revisao final entra tarde;
- bordas operacionais e suporte continuam fora do primeiro frame;
- fluxo guiado nao foi reaberto nem alterado semanticamente.

## Validacao

- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou

## Resultado final

O envio ficou mais leve no primeiro contato sem perder o fluxo guiado ja validado. O custo foi deslocado para chunks que so carregam quando a etapa correspondente realmente aparece.
