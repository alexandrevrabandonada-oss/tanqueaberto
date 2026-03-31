# Estado da Nação — Home Orquestrada Final

Data: 2026-03-26

## Objetivo
Simplificar a home adaptativa para que a primeira dobra tenha apenas um foco principal por contexto, sem coexistência de superfícies grandes demais.

## Mapa Final De Prioridade
1. `critical-offline` - erro crítico / offline severo.
2. `mission-active` - missão ativa.
3. `first-visit` - primeira visita / ativação.
4. `street-mode` - modo rua.
5. `operation-normal` - operação normal.
6. `senior-hub` - uso recorrente / hub.

## Regras Aplicadas
- Apenas um bloco principal acima da dobra por estado.
- Estados concorrentes foram recolhidos ou escondidos quando não ajudam a leitura inicial.
- `operation-normal` mantém o mapa como foco principal.
- `senior-hub` abre espaço para memória curta, fila e continuidade.
- `critical-offline`, `mission-active` e `first-visit` reduzem ruído ao mínimo.

## Implementação
### Orquestração única de estado
- Novo helper em [lib/ui/home-orchestrator.ts](C:/Projetos/Tanque%20Aberto/lib/ui/home-orchestrator.ts)
- `HomeBrowser` agora deriva o estado principal a partir de conexão, missão, perfil, histórico e contexto territorial.

### Home mais disciplinada
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)
  - calculou `homeState` único
  - passou a renderizar um único topo principal por contexto
  - `SurfaceOrchestrator` só entra fora do estado normal e com `maxPrimaryItems={1}`
  - quick access, memória, recorte territorial e submissões foram condicionados por estado
  - telemetria do estado principal foi adicionada

### Shell de superfícies
- [components/layout/surface-orchestrator.tsx](C:/Projetos/Tanque%20Aberto/components/layout/surface-orchestrator.tsx)
  - passou a aceitar `maxPrimaryItems`
  - na home, isso limita a primeira superfície a um bloco principal

## Telemetria
Eventos adicionados ou preservados para esta consolidação:
- `home_primary_block_view`
- `home_block_interacted`
- `first_fold_action`
- interações já existentes em quick actions, missão e lista

## Validação
- `npm run build` passou.
- Persistem warnings antigos de hooks em arquivos já conhecidos.
- O warning dinâmico do `/hub` continua conhecido e não bloqueou o build.

## Screenshots
Não consegui gerar uma nova rodada de screenshots neste ambiente porque o runtime do Next não sobe para captura de navegador aqui, com erro de spawn `EPERM`.

## Arquivos Principais
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)
- [components/layout/surface-orchestrator.tsx](C:/Projetos/Tanque%20Aberto/components/layout/surface-orchestrator.tsx)
- [lib/ui/home-orchestrator.ts](C:/Projetos/Tanque%20Aberto/lib/ui/home-orchestrator.ts)

## Observação Final
A home agora responde ao contexto com prioridade fechada em vez de mostrar várias explicações grandes ao mesmo tempo. O próximo ajuste natural, se necessário, é uma passada visual fina nos estados `mission-active` e `senior-hub`.
