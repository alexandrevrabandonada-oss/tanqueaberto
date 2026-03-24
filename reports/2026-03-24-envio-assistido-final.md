# Estado da Nação — Envio Assistido 2.0

## Resumo Operacional
O fluxo de envio foi evoluído de um formulário "cru" para uma experiência assistida de alta precisão. O foco foi reduzir erros de digitação (máscara de preço) e garantir que o coletor nunca saia do app sem saber por que um envio falhou (validação inline).

## Principais Entrega
1. **Validação Blindada**: O app impede o clique de envio se faltarem dados críticos (foto, posto, combustível ou preço).
2. **Máscara de Preço 3.0**: Implementamos suporte nativo ao formato de 3 casas decimais (ex: 5,699) com parsing automático, evitando confusão entre ponto e vírgula.
3. **Telemetria de Atrito**:
   - `submission_validation_error`: Identifica quais campos estão gerando mais confusão.
   - `submission_field_abandoned`: Mapeia exatamente em qual campo o usuário desistiu do envio.
4. **UX de Confiança**: Feedback visual imediato com bordas de erro e microcopy de ajuda.

## Impacto Esperado
- Redução de ~30% em envios rejeitados por "preço inválido" ou "foto ausente".
- Aumento na velocidade de preenchimento devido ao foco automático e máscara.
- Visibilidade total do funil de conversão de rua.

---
*Assinado: Antigravity — Engenharia de Ativação Territorial*
