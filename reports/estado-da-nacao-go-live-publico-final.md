# Estado da Nação: go-live publico final

## Resumo executivo

Verdicto: **GO**

Base testada: https://bomba-aberta.vercel.app

O launch gate operacional foi unificado em um comando unico e agora valida:
- envs criticas
- saúde HTTP e healthcheck
- storage do bucket de foto
- base URL e assets publicos
- presença minima de postos ativos
- smoke dos fluxos vitais

## Checklist operacional curto

| Checagem | Status | Evidencia |
|---|---|---|
| Envs críticas | PASS | ok |
| Base URL / HTTP | PASS | root=200 health=200 |
| Storage | PASS | price-report-photos |
| Dados mínimos | PASS | 133 postos ativos |
| Assets públicos | PASS | manifest=true sw=true icons=true |
| Smoke vital | PASS | exit=0 |

## Pendencias por severidade

### Critical
- Nenhuma

### High
- Nenhuma

### Medium
- Nenhuma

### Low
- Nenhuma

## Smoke vital coberto

- home abre com mapa e valor da primeira dobra
- busca e leitura publicas carregam sem login
- posto abre e oferece o proximo passo
- `/enviar` carrega o fluxo de rua sem barrar a entrada
- `/hub` retorna continuidade local sem exigir conta

## Observacoes

- O healthcheck publicamente exposto valida o bucket correto de foto.
- O gate final nao recria fluxo novo; ele apenas unifica os checks reais de producao.