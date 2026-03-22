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
