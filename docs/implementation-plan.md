# Plano de implementacao - Bomba Aberta

## Etapa 1. Fundacao
- Estrutura do app.
- PWA instalavel.
- Design system base.
- Mock data regional.
- Schema e seed iniciais.

## Etapa 2. Dados reais
- Ler `stations` e `price_reports` do Supabase.
- Montar a view de ultimo preco por posto e combustivel.
- Trocar mocks por server components e queries.

## Etapa 3. Envio de preco
- Formulario com foto.
- Upload para Supabase Storage.
- Status `pending` para moderacao.
- Feedback claro de envio.

## Etapa 4. Moderacao
- Auth simples para admin.
- Aprovar, rejeitar e sinalizar registros.
- Notas de moderacao.

## Etapa 5. Produto vivo
- Busca por cidade, bairro e posto.
- Historico mais rico por posto.
- Alertas de recencia.
- Feed em tempo real.
