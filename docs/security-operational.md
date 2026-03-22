# Segurança operacional

## Rate limit do envio

O envio público usa uma janela simples por IP + posto + combustível, com janela de 15 minutos.

Regras práticas:
- até 3 tentativas por janela
- bloqueio temporário quando o limite é excedido
- honeypot e validação de foto continuam ativos
- falhas de proteção e bloqueio ficam registradas em `operational_events`

## Logs administrativos

As ações críticas do admin entram em `admin_action_logs`.

O que é auditado:
- aprovação e rejeição de reports
- curadoria territorial de postos
- execuções manuais de jobs operacionais
- logout do admin

## Observabilidade mínima

O painel em `/admin/ops` mostra:
- envios, aprovações e rejeições recentes
- bloqueios do rate limit
- erros de upload
- erros de auth
- falhas de job/cron
- volume por cidade e combustível
- ações administrativas recentes
- eventos operacionais recentes

## Como investigar abuso

1. Abra `/admin/ops`.
2. Verifique `Bloqueios`, `Erros de upload` e `Erros de auth`.
3. Olhe os `Eventos recentes` para entender o motivo.
4. Consulte `admin_action_logs` quando o problema envolver moderação ou curadoria.
5. Se o envio estiver bloqueado por rate limit, espere a janela expirar e tente de novo.

## Erros comuns do beta

- `Você já enviou muitas vezes em pouco tempo.`: rate limit acionado.
- `A proteção do envio está temporariamente indisponível.`: falha de leitura/escrita na tabela de limite.
- `Não foi possível enviar a foto agora.`: upload falhou ou bucket indisponível.
- `Sua sessão expirou.`: entre de novo em `/admin/login`.

## Leitura operacional

Se a taxa de bloqueio subir, o problema tende a ser abuso, repetição de envio ou janela curta demais.
Se os erros de upload subirem, o primeiro ponto de revisão é bucket, tipo de arquivo e limite de tamanho.
Se os erros de auth subirem, revisar allowlist, credenciais e expiração de sessão.

## Beta fechado

- O acesso público pode ser bloqueado com `NEXT_PUBLIC_BETA_CLOSED=1`.
- O convite é simples e usa o código em `BETA_INVITE_CODE`.
- O cookie de acesso do beta libera as rotas públicas enquanto o beta estiver fechado.
- O feedback dos testers entra em `beta_feedback_submissions` e aparece no painel `/admin/ops`.
- A home mostra claramente que o produto está em beta fechado e aponta para feedback e lacunas.

## Como convidar testers

1. Gere o código de convite e distribua apenas para o grupo pequeno de testes.
2. Envie a URL do domínio real.
3. O tester abre `/beta`, insere o código e ganha acesso.
4. O acesso expira depois de 14 dias, ou quando o cookie for apagado.

## Como acompanhar lacunas

- Use o painel `/admin/ops` para ver cidades frágeis, postos sem preço recente e combustíveis com baixa massa.
- Use o bloco de feedback beta para ver os temas mais recorrentes.
- Priorize Volta Redonda, Barra Mansa e Barra do Piraí antes de ampliar o grupo.

## Quando sair do beta fechado

Considere abrir o domínio quando houver:
- cobertura mínima nas cidades prioritárias
- feedback estável sem falhas recorrentes de upload/auth
- cron e jobs rodando sem erro
- taxa de bloqueio baixa e previsível
