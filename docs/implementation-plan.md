# Plano de implementacao do Tanque Aberto

## Etapa 1. Base do produto
- Fechar identidade visual, tipografia e componentes-base.
- Ligar deploy automatico entre GitHub e Vercel.
- Criar projeto Supabase e aplicar schema inicial.

## Etapa 2. Dados reais
- Implementar consultas reais para `stations` e `price_reports`.
- Substituir mocks por server components + Supabase.
- Criar busca por posto, cidade e bairro.

## Etapa 3. Envio de preco
- Formulario completo com camera/upload.
- Extrair EXIF quando existir e preencher `photo_taken_at`.
- Criar feedback de envio e fila `pending`.

## Etapa 4. Moderacao
- Proteger `/admin` com auth.
- Aprovar, rejeitar e marcar como `flagged`.
- Registrar nota de moderacao.

## Etapa 5. Observatorio vivo
- Feed em tempo real.
- Destaques por cidade/bairro.
- Estatisticas por combustivel e historico visual.
