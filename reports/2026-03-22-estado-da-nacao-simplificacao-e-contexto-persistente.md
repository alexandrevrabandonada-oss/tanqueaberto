# Estado da Nação - Simplificação e contexto persistente

## O que mudou
- A primeira dobra da home ficou menos densa: busca, cidade prioritária, combustível principal, recência básica e o toggle entre todos os postos e só com preço recente ficaram na linha de frente.
- Os filtros mais específicos foram empurrados para um bloco de "Mais filtros", com progressive disclosure.
- O contexto do usuário passou a ser salvo localmente, incluindo cidade, combustível, recência, presença e último posto visitado.
- A lista do recorte passou a ordenar de forma mais útil, priorizando cidade selecionada, cidades prioritárias, recência e prioridade editorial/operacional.
- O card rápido do mapa ficou mais explícito sobre status de preço, recência e combustível filtrado.

## O que isso resolve
- Reduz a carga cognitiva para quem entra frio.
- Ajuda a ler o app por cidade, sem depender só da URL.
- Reforça a continuidade entre mapa, lista e tela de posto.
- Deixa mais claro quando o usuário está vendo cadastro territorial, preço recente ou lacuna.

## O que ainda merece atenção
- O padrão de persistência está no navegador; se o tester trocar de aparelho ou limpar dados, o contexto se perde.
- A cidade prioritária melhora o foco, mas ainda pode esconder outras cidades se o tester não abrir "Mais filtros".
- O sorteio editorial ajuda a leitura, mas ainda depende da qualidade da cobertura local e da recência aprovada.

## Próximos passos recomendados
- Testar a home com testers reais e medir se a cidade prioritária reduz abandono.
- Ajustar a ordem e a quantidade de cidades visíveis se a navegação ficar restrita demais.
- Levar o mesmo padrão de persistência para outras telas públicas quando fizer sentido.
- Revisar se a busca por cidade precisa de um modo mais explícito em beta fechado.
