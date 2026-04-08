# Estado da Nação: Playbook Operacional OPS

## Diagnóstico curto

O Bomba Aberta já saiu da fase de falta de painel. O gargalo agora é transformar leitura em rotina curta, repetível e humana dentro do `admin/ops`.

Hoje a operação já tem sinais para confiança progressiva, cobertura territorial, deduplicação e economize/oportunidade. O que faltava era um rito simples por frequência para evitar que o time precise reinterpretar o painel toda semana.

## Patch completo

- Nova superfície curta de playbook em `admin/ops`:
  - arquivo novo em `app/admin/ops/components/operational-playbook-panel.tsx`
  - organizada em `todo dia`, `2x por semana` e `toda semana`
  - conectada aos readouts já existentes, sem criar dashboard novo
- Integração na página principal de OPS em `app/admin/ops/page.tsx`
- Âncoras adicionadas para abrir diretamente:
  - `#resumo-operacional-unificado`
  - `#confianca-progressiva`
- Relacionamento explícito com as frentes já existentes:
  - fila territorial
  - moderação / fast-lane / alto risco
  - deduplicação / renomeação popular
  - economize / oportunidade
  - resumo operacional unificado

## Antes

- O painel mostrava bem os sinais, mas não convertia isso em rito semanal claro.
- O operador precisava decidir sozinho a frequência e a ordem de leitura.
- O custo cognitivo ficava em “o que olho agora?” e “qual frente puxo primeiro?”.

## Depois

- O `admin/ops` passa a ter um playbook curto logo na superfície principal.
- Cada frequência já diz:
  - o que olhar
  - o que fazer
  - para onde clicar
- Os alertas principais já vêm com ação operacional sugerida:
  - confiança progressiva em atenção/problema
  - economize perdendo tração
  - cobertura territorial travada
  - duplicidade voltando a subir

## Antes / Depois resumido

- Antes: painel forte, rito implícito.
- Depois: painel forte, rito explícito e curto.

## Verificações

- `npm run build`: OK
- `npm run typecheck`: OK
- `npm run verify`: OK

### Observações das verificações

- O `verify` passou, mas manteve 3 warnings antigos de `<img>` já existentes no projeto:
  - `app/loading.tsx`
  - `app/postos/[id]/page.tsx`
  - `components/brand/pwa-splash.tsx`
- Não apareceram erros novos relacionados ao playbook operacional.