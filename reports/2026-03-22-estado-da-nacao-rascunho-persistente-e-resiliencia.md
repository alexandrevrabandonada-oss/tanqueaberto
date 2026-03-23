# Estado da Nação - Rascunho Persistente e Resiliencia

Data: 2026-03-22

## O que foi endurecido
- O fluxo de envio passou a persistir rascunho localmente com prazo curto, incluindo posto, combustivel, preco, status e metadados da tentativa.
- A foto agora usa persistencia local via IndexedDB enquanto a aba estiver disponivel, reduzindo perda em reload e reconexao instavel.
- O app oferece retomada segura de envio quando detecta rascunho incompleto, com opcao de continuar, refazer foto ou abandonar com clareza.
- As mensagens de erro ficaram mais especificas para perda de conexao, timeout, upload interrompido, foto perdida e envio nao concluido.
- A telemetria passou a registrar retomada de rascunho, foto refeita, foto perdida e retry manual.

## O que continua de fora
- Nao existe fila offline real.
- O app nao faz sincronizacao tardia de envio quando a rede volta.
- O rascunho depende de armazenamento local do navegador e pode ser perdido se o usuario limpar dados do site ou se o browser remover o conteudo.
- A recuperacao de foto nao cobre cenarios de perda fora do armazenamento local disponivel.

## Limites metodologicos
- A resiliencia foi desenhada para uso de rua com conexao ruim, nao para uso offline completo.
- A persistencia e util para evitar frustacao em reload, mas nao substitui uma fila de envio assincrona.
- A foto salva em Blob local ajuda muito no curto prazo, mas continua sujeita a limites do navegador e do dispositivo.

## Proximos passos recomendados
- Validar o fluxo em campo com rede oscilante e camera mobile real.
- Medir quantas vezes o rascunho e retomado e quantas fotos precisam ser refeitas.
- Se a perda de envio continuar relevante, evoluir para uma fila local simples com reenvio assistido.
- Manter o envio curto e camera-first, sem adicionar complexidade de offline-first completo.
