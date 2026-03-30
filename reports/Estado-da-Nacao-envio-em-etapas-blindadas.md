# Estado da Nacao: envio em etapas blindadas

## Diagnostico curto
O fluxo de `/enviar` ainda parecia um formulario aberto: foto, posto, combustivel e preco podiam disputar a tela e o rodape nao deixava claro qual era a proxima acao. Isso aumentava carga mental, especialmente no mobile e em uso rapido de rua.

## O que foi feito
- Transformei o fluxo em uma progressao guiada com uma etapa principal por vez: Foto -> Posto -> Combustivel -> Preco -> Revisao -> Enviar.
- O botao fixo do rodape passou a mudar conforme a etapa ativa.
- A foto continua dominante, mas agora o restante entra como passo seguinte, nao como bloco concorrente.
- Posto e combustivel ficam pre-sugeridos, mas o usuario confirma cada um antes de seguir.
- O preco entra como etapa propria e precisa de uma revisao final obrigatoria antes do envio.
- A revisao final mostra posto, combustivel, preco e a mensagem curta de que o envio vai para revisao.

## Antes / Depois
### Antes
- O formulario mostrava varios blocos ao mesmo tempo.
- O CTA final ficava no fim da pagina.
- A revisao final nao era explicitamente separada do preenchimento.
- O usuario podia sentir que estava num formulario aberto, nao num caminho guiado.

### Depois
- Uma etapa principal por vez.
- Rodape fixo com CTA claro e curto.
- Revisao final obrigatoria antes de enviar.
- Menos decisao visivel em cada momento.
- O caminho ficou mais dificil de errar por pressa ou pouca familiaridade digital.

## Detalhes da logica
- `Photo` abre a camera.
- `Posto` confirma a sugestao ou deixa o usuario trocar.
- `Combustivel` confirma a sugestao ou permite troca.
- `Preco` entra depois das escolhas anteriores.
- `Revisao` bloqueia o envio ate a pessoa conferir os tres campos principais.
- O envio entra em revisao, sem linguagem longa nem login adicional.

## Validacao
- `npm run typecheck` passou.
- `npm run build` passou.
- `npm run verify` passou.

## Observacao
- O build continua emitindo warnings antigos de cache do webpack e um warning de hook ja conhecido em `components/layout/retention-hub.tsx`, mas sem erro de compilacao.
