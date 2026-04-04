# Estado da Nacao: oportunidade de preco

## Diagnostico curto
A superficie de economia ja ajudava a comparar, mas ainda faltava um sinal curto de rua para dizer quando valia agir agora. O vazio estava entre o ranking e a decisao: o usuario via preco, mas nao via oportunidade resumida.

## O que entrou nesta passada
- bloco novo de `Leitura de oportunidade` dentro da superficie `Vale a pena para mim`
- leitura curta e nao barulhenta para tres tipos de oportunidade:
  - combustivel selecionado chamando atencao perto de voce
  - comparacao popular de gasolina x etanol no bairro quando houver base suficiente
  - preco que caiu no posto que a pessoa acompanha
- uso dos sinais ja existentes para segurar a qualidade:
  - filtro de combustivel
  - recencia
  - confianca
  - distancia
  - comparacao com media recente do recorte
- CTAs preservados por card:
  - `Ver posto`
  - `Tracar rota`
  - `Atualizar preco`
- comportamento conservador:
  - sem oportunidade quando a base estiver curta ou fraca
  - sem virar sistema de alerta pesado ou push

## Antes
- a home mostrava comparacao e melhor opcao, mas nao avisava de forma direta quando aparecia uma chance real de abastecer melhor
- a pessoa ainda precisava interpretar sozinha se aquele preco barato era oportunidade ou apenas mais um item na lista
- nao havia leitura resumida para queda de preco em posto favorito

## Depois
- a home passa a destacar oportunidade real sem inflar ruido
- o bloco novo so aparece com sinais concretos de vantagem
- a decisao fica mais curta para uso de rua, sem perder preco bruto, recencia, confianca e distancia
- posto acompanhado entra na leitura quando houver queda real de preco no combustivel filtrado

## Arquivos tocados
- `components/home/home-deferred-sections.tsx`
- `reports/Estado-da-Nacao-oportunidade-de-preco.md`

## Validacao executada
- `npm run typecheck` : ok
- `npm run build` : ok
- `npm run verify` : ok

## Observacoes de validacao
- a auditoria do projeto continuou sinalizando as envs recomendadas ausentes `STATION_EDITOR_SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL` e `NEXT_PUBLIC_APP_URL`, mas sem falha de build ou de verificacao
- o build manteve o aviso conhecido de runtime edge desabilitando geracao estatica para a pagina correspondente
