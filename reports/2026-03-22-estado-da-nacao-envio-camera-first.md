# Estado da Nação - Envio camera-first

## O que mudou
- O topo do fluxo de envio passou a orientar para a câmera primeiro, com CTAs fortes para abrir a captura imediatamente.
- O envio ficou mais compacto quando o usuário chega com contexto de posto, reduzindo rolagem e removendo distrações desnecessárias.
- O combustível sugerido agora pode vir do contexto atual e da navegação anterior, o que reduz o número de decisões na rua.
- O formulário passou a priorizar a ordem de uso real: foto, posto, combustível, preço e envio.
- A confirmação final ficou mais clara e traz caminho de volta para o posto ou para um novo envio.
- A telemetria ganhou eventos por etapa e um evento de abandono do formulário.

## O que isso resolve
- Reduz o atrito para quem quer só mandar uma prova rápida no posto.
- Diminui a dependência de upload manual como primeira ação.
- Mantém o fluxo curto para quem chega vindo de um posto específico.
- Dá mais clareza para entender onde o usuário trava antes de concluir o envio.

## O que ainda depende de validação em campo
- O botão de câmera precisa ser testado em dispositivos reais para confirmar a experiência do `capture` no mobile.
- O modo compacto deve ser observado com testers para ver se a remoção de ruído não esconde informação importante demais.
- O abandono por etapa é útil, mas ainda depende de volume suficiente para leitura confiável.

## Próximos passos recomendados
- Testar o fluxo em rua com foco em foto -> preço -> envio.
- Medir a taxa de abandono por etapa nos primeiros testes.
- Ajustar a confirmação final se os testers voltarem com frequência para o mesmo posto.
- Considerar um atalho ainda mais forte da tela do posto para abrir a câmera diretamente se o uso real pedir isso.
