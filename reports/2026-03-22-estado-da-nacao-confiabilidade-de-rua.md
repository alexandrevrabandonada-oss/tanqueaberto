# Estado da Nação - Confiabilidade de Rua

Data: 2026-03-22

## O que mudou
- O fluxo de envio agora tolera melhor falha de upload e conexão ruim.
- O formulário de envio mantém o rascunho em sessão e oferece retry sem refazer tudo.
- O app mostra banners claros para conexão offline, conexão fraca e atualização de PWA disponível.
- O service worker passou a responder melhor em navegação, offline e atualização.
- Existe um laboratório de rede em desenvolvimento para simular lentidão, timeout, falha de upload e offline.

## Como ficou o uso na rua
- Se a foto falhar, o tester consegue tentar novamente com os dados já preenchidos.
- Se a conexão cair, o app informa isso de forma explícita em vez de falhar em silêncio.
- Se houver atualização do PWA, o usuário recebe um convite claro para recarregar.
- O app continua simples; não virou offline-first completo.

## O que ainda é provisório
- Não existe fila offline real de envios ainda.
- A recuperação de foto continua limitada à sessão atual do navegador.
- A simulação de rede é só para dev/preview e depende de cookie local.
- O comportamento em redes ruins ainda precisa ser observado em campo real.

## Riscos remanescentes
- Em algumas quedas de conexão, o navegador pode perder o arquivo da foto se a página recarregar.
- O retry ajuda, mas ainda depende de o usuário manter a aba viva.
- O cache do PWA melhora a navegação, mas não substitui dados locais persistidos.

## Próximos passos recomendados
1. Testar o envio em rua com internet instável e registrar onde o fluxo ainda quebra.
2. Se os testes mostrarem perda frequente de foto, considerar rascunho persistente com armazenamento local mais robusto.
3. Medir com a telemetria nova quantas falhas de upload e timeout acontecem de verdade.
4. Só depois disso pensar em uma fila offline mais completa.
