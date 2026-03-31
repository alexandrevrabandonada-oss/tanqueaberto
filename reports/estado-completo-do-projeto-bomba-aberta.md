# Estado Completo do Projeto: Bomba Aberta

Data de consolidação: 2026-03-27

## Resumo executivo

O projeto está em estado funcional para abertura pública real.

O ponto mais importante é que o alvo público vivo voltou a existir e o gate real passou em `GO` contra o domínio canônico. O runtime público também foi isolado de leituras administrativas frágeis e as queries de `price_reports` foram padronizadas para os nomes canônicos do schema.

Resumo curto:
- deploy público real restaurado
- gate real público aprovado
- runtime público isolado de falhas internas de schema
- queries legadas de `price_reports` limpas
- `/postos/sem-atualizacao` corrigida na fronteira server/client
- verificações locais e de drift passando

## Estado por frente

### 1. Deploy e go-live

Estado:
- projeto Vercel relinkado para `alexandrevrabandonada-oss-projects/bomba-aberta`
- envs críticas adicionadas no projeto Vercel
- deployment de produção criado e promovido
- alias canônico `https://bomba-aberta.vercel.app` apontando para o deploy vivo

Veredito atual:
- `GO` no gate real público

Referências:
- [reports/estado-da-nacao-deployment-real-vercel-fix.md](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-deployment-real-vercel-fix.md)
- [reports/estado-da-nacao-go-live-real-rerun-final.md](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-go-live-real-rerun-final.md)

### 2. Runtime público

Estado:
- superfícies públicas não dependem mais de `sys_config` para renderizar
- falhas em tabelas de ops/audit passam a fallback silencioso quando necessário
- o `RootLayout` não carrega mais o provider global de histórico de envios, evitando a fronteira client/server problemática que afetava prerender remoto
- a rota `/postos/sem-atualizacao` voltou a abrir normalmente em SSR

Referências:
- [reports/estado-da-nacao-isolamento-runtime-publico.md](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-isolamento-runtime-publico.md)
- [reports/estado-da-nacao-fix-use-test-mode-server-boundary.md](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-fix-use-test-mode-server-boundary.md)

### 3. Schema e banco

Estado:
- o schema runtime foi reconciliado com o código
- os aliases legados `observed_at` e `submitted_at` foram eliminados do runtime e dos tipos de linha
- leituras de auditoria e observabilidade passaram a usar `reported_at`, `approved_at`, `rejected_at` e `created_at`
- o guardrail de drift protege os nomes canônicos atuais

Referências:
- [reports/estado-da-nacao-cleanup-price-reports-legacy-columns.md](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-cleanup-price-reports-legacy-columns.md)
- [reports/estado-da-nacao-reconciliacao-schema-runtime.md](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-reconciliacao-schema-runtime.md)
- [reports/estado-da-nacao-alinhamento-producao-schema-real.md](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-alinhamento-producao-schema-real.md)

### 4. Produto público

Estado:
- home pública, atualizações, posto, enviar e hub estão operacionais
- shell público foi simplificado para não disputar CTA com conteúdo em mobile
- o fluxo de envio, hub e histórico local funcionam sem login tradicional

Referências:
- [reports/estado-da-nacao-shell-publico-final.md](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-shell-publico-final.md)
- [reports/estado-da-nacao-hub-sessao-local-sem-login.md](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-hub-sessao-local-sem-login.md)
- [reports/estado-da-nacao-identidade-progressiva-aplicada.md](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-identidade-progressiva-aplicada.md)
- [reports/estado-da-nacao-onboarding-progressivo-gatilhos.md](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-onboarding-progressivo-gatilhos.md)

### 5. Observabilidade e operação

Estado:
- funil, fila, restauração de draft, latência de aprovação e identidade leve estão cobertos por eventos/consultas operacionais
- exportações administrativas continuam disponíveis
- primeira semana pública já tem leitura operacional e thresholds

Referências:
- [reports/estado-da-nacao-observabilidade-go-live.md](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-observabilidade-go-live.md)
- [reports/estado-da-nacao-operacao-primeira-semana.md](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-operacao-primeira-semana.md)

### 6. Antiabuso e moderação

Estado:
- rate limit e detecção de duplicado foram endurecidos
- feedback de moderação ficou mais explícito para o usuário sem login
- admin/ops continuam com auth forte e leitura explícita de erro

Referências:
- [reports/estado-da-nacao-moderacao-e-antiabuso.md](C:/Projetos/Tanque%20Aberto/reports/estado-da-nacao-moderacao-e-antiabuso.md)

## Validação atual

Passou:
- `npm run typecheck`
- `npm run build`
- `npm run verify`
- `npm run go-live:check` contra `https://bomba-aberta.vercel.app`

Smoke adicional executado:
- `GET /admin/ops`
- `GET /postos/sem-atualizacao`
- sem repetição de `submitted_at` / `observed_at` no stderr do servidor local

## Inventário de estado do repositório

O worktree continua sujo, com alterações distribuídas por várias frentes do produto, incluindo:
- shell público
- home
- hub
- envio
- observabilidade
- auditoria
- schema/migrations
- testes e artefatos de smoke

Isso significa que o código atual contém trabalho ainda não commitado em múltiplas áreas. O estado funcional está bom, mas o repositório ainda não está consolidado em um único commit limpo.

## Riscos residuais

Baixos, mas existentes:
- muitos arquivos estão alterados e precisam de consolidação se o objetivo for fechar uma linha de release limpa
- há artefatos de teste e logs no worktree que podem ser removidos/organizados depois, se desejado
- algumas superfícies internas de ops ainda dependem de schema exposto no banco real; hoje isso está tratado com fallback e isolamento do público, mas o ideal continua sendo manter o schema real alinhado

## Conclusão

O projeto está pronto operacionalmente para uso público real, com o alvo de produção vivo e validado.

Se a próxima etapa for organizar a base para entrega/commit, o mais importante agora é decidir o que entra na linha final de release e o que permanece apenas como trabalho em andamento.
