# Estado da Nação — Governança e Resiliência (Beta Ampliado)

## 1. Visão Geral
Este relatório consolida o salto operacional do **Bomba Aberta** para o beta ampliado, focando em duas frentes: **Governança Territorial** (quem entra e como decidimos abrir) e **Resiliência Técnica** (como o app sobrevive ao mundo real).

## 2. Governança: Coortes de Testers
Implementamos uma camada de segmentação para os coletores, permitindo uma operação disciplinada e comparável.

- **Segmentação Automática**: O motor de confiança (`CollectorTrust`) agora classifica coletores em coortes dinâmicas:
  - **ALPHA**: Testers fundadores e equipe.
  - **EXPERT**: Coletores de alto volume e precisão técnica.
  - **VETERAN**: Usuários regulares com histórico de aprovação.
  - **NEWBIE**: Novos entrantes no beta.
- **Featurização por Coorte**: Capacidade de ativar flags experimentais e telemetria estendida apenas para grupos específicos.
- **Painel de Monitoramento**: Nova interface administrativa para acompanhar a retenção e performance comparativa entre coortes.

## 3. Decisão: Framework Go/No-Go
Acabamos com o "achismo" na expansão do beta. A decisão de abrir novos recortes agora é baseada em dados frios.

- **Readiness Engine**: Motor que calcula um score (0-100) baseado em:
  - Sucesso de envio (fotos e preços).
  - Atrito por sessão (bugs e lentidão reportados).
  - Qualidade do dado (taxa de aprovação).
- **Painel Executivo**: Interface semafórica (GO / CAUTION / NO-GO) no Admin Ops.
- **Snapshots Históricos**: Registro de estados de prontidão para auditoria de decisões de rollout.

## 4. Resiliência: Arquitetura de Rua
O app foi endurecido para lidar com a instabilidade inerente ao trabalho de campo.

- **Warm Start & Snapshot Offline**:
  - Hidratação instantânea da Home e da Timeline via LocalStorage.
  - Indicador visual de "Snapshot Offline" para transparência ao usuário.
  - Navegação resiliente: o app não quebra se o servidor estiver inacessível.
- **Try-Catch de Superfície**: Camada de proteção em todas as páginas críticas (`Home`, `Atualizações`, `Enviar`, `Hub`) para evitar white-screens em caso de falha de API ou ambiente.
- **BottomNav Inteligente**: Reformulação técnica para garantir interatividade total, ignorando falhas de prefetch e garantindo prioridade de renderização (`z-index: 999`).

## 5. Próximos Passos
1. **Kill Switches vinculados ao Readiness**: Se o score de uma cidade cair abaixo de 40, desativar automaticamente novos convites para aquele recorte.
2. **Debrief de Sessão Automático**: Transformar o encerramento da sessão em insights imediatos para o motor de Readiness.

---
*Assinado: Antigravity — Inteligência Territorial Bomba Aberta*
