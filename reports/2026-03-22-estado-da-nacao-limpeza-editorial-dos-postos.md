# Estado da Nação — Limpeza editorial dos postos

## O que foi feito

A camada pública de nomes de postos ficou mais legível e menos repetitiva.

Mudanças principais:

- `name_public` passou a cair melhor em fallback legível quando o cadastro vem genérico.
- O nome público agora tenta usar bairro, via, bandeira ou cidade como complemento útil.
- A lista, os cards e o mapa passaram a exibir o nome público mais forte em vez do nome cru sempre que possível.
- O badge de localização em revisão ficou menos intrusivo e aparece só quando realmente pesa na decisão.
- O painel interno ganhou uma fila de limpeza editorial para nomes genéricos e suspeitas visuais de repetição.

## O que continua preservado

- `name_official` continua intacto como trilha de auditoria.
- O cadastro oficial da ANP não foi alterado para caber no visual.
- A curadoria territorial continua separada da edição pública.

## O que melhorou na leitura pública

- Menos cards com título genérico "Posto".
- Mais distinção entre postos do mesmo bairro.
- Melhor leitura rápida no mapa e na lista.
- Menos badges competindo com o nome do posto.

## Riscos remanescentes

- Alguns cadastros ainda são fracos o bastante para cair em fallback parecido.
- A heurística não substitui revisão humana em casos limítrofes.
- A repetição visual pode persistir quando a base oficial vem muito parecida em mesmo bairro ou via.

## Próximos passos recomendados

- Usar a fila editorial do `/admin/ops` para corrigir os piores casos.
- Marcar nomes públicos bons manualmente quando a heurística não bastar.
- Reavaliar a regra depois de mais volume de beta na rua.
- Se necessário, criar um fluxo leve de edição aprovada para `name_public` apenas no admin.
