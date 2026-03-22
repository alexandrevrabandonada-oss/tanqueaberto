# Estado da Nação — Pronto para beta fechado

Data: 22 de março de 2026

## O que já está pronto

- O app passou a ter gate de beta fechada em domínio real com rota `/beta`.
- O acesso libera por código simples de convite e cookie persistente por 14 dias.
- A home deixa claro que o produto está em beta fechado e aponta para feedback e lacunas.
- Existe um canal simples de feedback em `/feedback` para testers reportarem problema, sugestão, tela confusa ou posto faltando.
- O painel `/admin/ops` agora mostra feedback beta recente e páginas mais citadas.
- A observabilidade operacional continua ativa para envios, uploads, auth, jobs e moderação.
- O app continua honesto ao separar posto cadastrado de posto com preço recente.

## O que ainda limita a abertura

- A cobertura de preço recente ainda é desigual entre cidades.
- Parte da base depende de densificação contínua em Volta Redonda, Barra Mansa e Barra do Piraí.
- O beta ainda depende de convite manual simples, sem automação de distribuição.
- A telemetria é mínima e fica concentrada no painel interno, sem alertas externos.
- O feedback ainda é operacional, não existe triagem avançada nem fila editorial.

## Prioridade de ativação por cidade

1. Volta Redonda
2. Barra Mansa
3. Barra do Piraí
4. Resende
5. Porto Real
6. Pinheiral
7. Quatis

## Como operar o beta fechado

- Distribuir apenas o código do convite para o grupo pequeno de testers.
- Pedir que cada tester use o app e envie feedback quando algo estiver confuso ou faltando.
- Acompanhar `/admin/ops` diariamente na primeira semana.
- Vigiar bloqueios de rate limit, falhas de upload e falhas de auth.
- Priorizar a cobertura onde a página `/postos/sem-atualizacao` ainda estiver cheia.

## Próximos passos recomendados

1. Rodar o beta com 5 a 20 testers reais por alguns dias.
2. Acompanhar se o novo canal de feedback gera sinais repetidos de confusão ou falta de cobertura.
3. Ajustar a gate e a comunicação do beta conforme o comportamento real.
4. Criar um fluxo simples de aprovação interna para quando um tester pedir acesso adicional.
5. Só depois disso pensar em ampliar o domínio aberto ou expandir a entrada pública.

## Arquivos-chave desta etapa

- [middleware.ts](/C:/Projetos/Tanque%20Aberto/middleware.ts)
- [app/beta/page.tsx](/C:/Projetos/Tanque%20Aberto/app/beta/page.tsx)
- [app/beta/actions.ts](/C:/Projetos/Tanque%20Aberto/app/beta/actions.ts)
- [app/feedback/page.tsx](/C:/Projetos/Tanque%20Aberto/app/feedback/page.tsx)
- [app/feedback/actions.ts](/C:/Projetos/Tanque%20Aberto/app/feedback/actions.ts)
- [components/beta/beta-invite-form.tsx](/C:/Projetos/Tanque%20Aberto/components/beta/beta-invite-form.tsx)
- [components/feedback/beta-feedback-form.tsx](/C:/Projetos/Tanque%20Aberto/components/feedback/beta-feedback-form.tsx)
- [app/admin/ops/page.tsx](/C:/Projetos/Tanque%20Aberto/app/admin/ops/page.tsx)
- [lib/beta/gate.ts](/C:/Projetos/Tanque%20Aberto/lib/beta/gate.ts)
- [lib/beta/session.ts](/C:/Projetos/Tanque%20Aberto/lib/beta/session.ts)
- [lib/beta/feedback.ts](/C:/Projetos/Tanque%20Aberto/lib/beta/feedback.ts)
- [supabase/migrations/20260322_010_beta_closed_feedback.sql](/C:/Projetos/Tanque%20Aberto/supabase/migrations/20260322_010_beta_closed_feedback.sql)
