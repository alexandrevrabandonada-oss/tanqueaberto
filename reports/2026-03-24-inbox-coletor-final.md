# Estado da Nação — Inbox do Coletor

## Resumo Operacional
Implementamos uma camada de retorno assíncrono para fechar o loop de feedback com o coletor. Agora, cada mudança no ciclo de vida de um envio (审核, aprovação, rejeição) gera uma notificação discreta e persistente no Hub do usuário.

## Principais Entrega
1. **Inbox do Coletor**: Uma interface dedicada no Hub que lista eventos importantes sobre os envios do usuário.
2. **Hook `useInbox`**: Inteligência que compara o estado local de envios com o estado anterior para identificar mudanças de status sem precisar de infraestrutura complexa de push.
3. **Indicadores de Retenção**: Badge de notificações não lidas no cartão de perfil (`UtilityStatusCard`), incentivando o clique.
4. **Telemetria de Engajamento**:
   - `inbox_opened`: Mede o interesse nas novidades.
   - `inbox_item_click`: Rastreia o retorno ao item específico (Posto).
   - `inbox_cleared`: Mede o controle do usuário sobre sua lista.

## Impacto Esperado
- Aumento na taxa de retorno (retention) de coletores ativos.
- Redução da ansiedade de "mandei e sumiu".
- Maior transparência sobre o processo de moderação.

---
*Assinado: Antigravity — Engenharia de Ativação Territorial*
