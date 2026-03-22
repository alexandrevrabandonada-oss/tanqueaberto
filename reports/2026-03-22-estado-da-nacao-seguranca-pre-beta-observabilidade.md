# Estado da Nação — Segurança pré-beta e observabilidade

Data: 22 de março de 2026

## O que foi protegido

- O envio público passou a ter rate limit simples por IP + posto + combustível + janela de 15 minutos.
- O honeypot continua ativo e agora os bloqueios ficam registrados.
- O admin segue protegido por Supabase Auth e allowlist, mas agora com mensagens melhores para sessão expirada e não autorizado.
- O logout do admin também virou ação auditável.

## O que passou a ser auditável

- Aprovado, rejeitado e curadoria territorial de postos entram em `admin_action_logs`.
- Bloqueios, falhas de upload, falhas de auth, sucesso de envio e falhas operacionais entram em `operational_events`.
- Execuções manuais de refresh, dossiês e seed de grupos ficam registradas.
- O painel `/admin/ops` mostra contadores e listas recentes para operação diária.

## O que mudou na operação

- Agora existe uma visão interna do que está acontecendo no beta: envios, aprovações, rejeições, bloqueios, erro de upload, erro de auth e falhas de job.
- A equipe não precisa inferir abuso ou instabilidade só olhando o app público.
- O painel operacional ficou mais próximo de uma rotina real de beta.

## O que ainda está provisório

- O rate limit é simples e suficiente para beta, mas não é um sistema antifraude completo.
- A telemetria é mínima e depende de consulta direta ao Supabase; não há pipeline externa de monitoramento.
- O volume por cidade e combustível ainda depende da massa atual da base.
- O painel não tem alerta automático nem notificação fora do app.

## Riscos remanescentes

- Se o beta crescer rápido, a janela de rate limit pode precisar de ajuste.
- Se o upload subir muito, o bucket e o tamanho máximo de foto precisam ser monitorados de perto.
- Se a allowlist de admin mudar sem revisão, o acesso pode parecer quebrado para quem opera.
- Se migrations não forem aplicadas no banco remoto, as tabelas novas de observabilidade não existirão.

## Próximos passos recomendados

1. Aplicar a migration `20260322_009_beta_security_observability.sql` no Supabase.
2. Rodar um beta fechado curto e observar taxa de bloqueio, upload falho e auth falha.
3. Ajustar a janela do rate limit se o volume legítimo for maior do que o esperado.
4. Fazer uma rotina de revisão diária do painel `/admin/ops` durante a primeira semana.
5. Se necessário, encaminhar a telemetria mínima para alertas externos depois que o beta provar tração.

## Arquivos-chave desta etapa

- [app/enviar/actions.ts](/C:/Projetos/Tanque%20Aberto/app/enviar/actions.ts)
- [app/admin/actions.ts](/C:/Projetos/Tanque%20Aberto/app/admin/actions.ts)
- [app/admin/ops/actions.ts](/C:/Projetos/Tanque%20Aberto/app/admin/ops/actions.ts)
- [app/admin/ops/page.tsx](/C:/Projetos/Tanque%20Aberto/app/admin/ops/page.tsx)
- [lib/ops/rate-limit.ts](/C:/Projetos/Tanque%20Aberto/lib/ops/rate-limit.ts)
- [lib/ops/logs.ts](/C:/Projetos/Tanque%20Aberto/lib/ops/logs.ts)
- [lib/ops/observability.ts](/C:/Projetos/Tanque%20Aberto/lib/ops/observability.ts)
- [supabase/migrations/20260322_009_beta_security_observability.sql](/C:/Projetos/Tanque%20Aberto/supabase/migrations/20260322_009_beta_security_observability.sql)
- [docs/security-operational.md](/C:/Projetos/Tanque%20Aberto/docs/security-operational.md)
