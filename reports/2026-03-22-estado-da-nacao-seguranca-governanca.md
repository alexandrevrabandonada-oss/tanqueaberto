# Estado da Nação - Segurança e Governança

Data: 2026-03-22

## O que foi protegido
- A rota `/admin` passou a exigir sessão real do Supabase Auth.
- A rota `/admin/login` foi criada para entrada administrativa separada da experiência pública.
- O acesso ao admin depende de allowlist por e-mail em `public.admin_users`.
- As ações de moderação passaram a rodar no servidor e exigem autenticação administrativa.
- O fluxo de envio continua público na interface, mas a validação e o insert passaram a acontecer no servidor com regras claras.
- O schema ganhou políticas RLS para leitura pública, moderação restrita e leitura pública de fotos.
- O bucket `price-report-photos` ficou com leitura pública e gestão restrita a admin.

## Políticas criadas
- `stations`: leitura pública apenas para postos ativos e leitura administrativa total.
- `price_reports`: leitura pública apenas de reports aprovados; admin pode ler, atualizar e deletar.
- `admin_users`: leitura apenas do próprio e-mail autenticado.
- `storage.objects`: leitura pública para fotos do bucket; gestão administrativa restrita.
- Função `public.is_admin_email()` para centralizar a checagem de allowlist.

## O que ainda está provisório
- O admin continua simples, sem MFA e sem perfis avançados.
- O fluxo de envio ainda não tem rate limit real no banco ou na borda.
- A moderação ainda depende de uma allowlist manual de e-mails.
- O storage público funciona, mas ainda não há geração de URL assinada para casos privados.
- Não há auditoria detalhada de ações administrativas.

## Riscos remanescentes
- Se o `SUPABASE_SERVICE_ROLE_KEY` vazar, o servidor continua com privilégio alto.
- Se o allowlist de `admin_users` não for mantido, o admin pode ficar inacessível.
- O envio público ainda pode ser abusado em volume até entrar rate limiting.
- A política de fotos públicas exige disciplina na origem das URLs e no bucket correto.

## Próximos passos recomendados
- Adicionar rate limiting simples no fluxo de envio.
- Criar log de auditoria para ações administrativas.
- Avaliar MFA para admin quando o beta fechar.
- Migrar o painel admin para um layout com histórico de moderação mais completo.
- Adicionar métricas mínimas para upload, aprovação e rejeição.
- Reforçar monitoramento de erro para auth, storage e insert de reports.
