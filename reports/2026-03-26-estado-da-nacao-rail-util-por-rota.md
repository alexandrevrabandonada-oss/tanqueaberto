# Estado da Nação — Rail Útil por Rota

## Objetivo
Transformar o rail direito em uma coluna operacional, com função própria por rota e sem cair em cards genéricos.

## Mapa de Função
- `/` -> resumo do recorte, prioridade e próxima ação.
- `/atualizacoes` -> estado do feed, última leitura e ação recomendada.
- `/enviar` -> ordem do fluxo, fila/moderação e atalho de retorno.
- `/hub` -> sessão, fila, missão e continuidade operacional.

## O que mudou
- O rail da home passou a destacar recorte atual, prioridade do território e postos sem preço recente.
- O rail de atualizações passou a mostrar volume aprovado, última leitura e o melhor próximo gesto.
- O rail de envio passou a orientar o fluxo, o estado de moderação e o posto selecionado quando existir.
- O rail do Hub foi condensado para sessão, fila local e missão antes dos componentes de apoio.

## Dados reais e placeholders
- Onde havia dado real, ele foi usado diretamente: contagem de recorte, atualizações, fila local, missão e posto pré-selecionado.
- Onde faltava dado operacional específico, a estrutura ficou pronta com texto honesto e acionável.

## Validação
- Build executado com sucesso antes desta consolidação.
- Screenshots wide não foram regeneradas nesta sessão porque o ambiente não disponibiliza browser de captura estável aqui.

## Risco residual
- O rail ainda depende da qualidade dos dados de origem para ser realmente útil. Se a base territorial estiver incompleta, o texto de apoio continua honesto, mas a força operacional cai.
