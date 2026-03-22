# Bomba Aberta - Estado da Nação

Data: 2026-03-22

## O que foi ligado de verdade
- Leitura real de postos ativos no Supabase.
- Leitura real de preços aprovados no Supabase.
- Mapa Leaflet com markers reais e clique levando ao posto.
- Home com cards reais e recência calculada.
- Feed de atualizações reais.
- Tela de posto com dados reais, foto recente e histórico.
- Envio funcional com foto, preço, apelido opcional e status `pending`.
- Admin mínimo funcional com fila de pendências e aprovação/rejeição.
- Upload real para o bucket `price-report-photos`.
- Helpers de formatação e acesso a dados separados em camadas simples.

## O que ainda está mockado ou simplificado
- Não existe autenticação robusta no admin ainda.
- Não há OCR, clustering de markers ou agregações avançadas.
- A busca por posto, bairro e cidade ainda não foi implementada.
- O fallback offline é básico.
- A moderação segue simples, sem trilha de auditoria e sem notas avançadas.

## Estrutura de pastas
- `app/`: rotas e fluxos do produto.
- `components/`: shell, mapa, formulário, posto e UI base.
- `lib/data`: consultas e montagem das visões do app.
- `lib/format`: moeda, tempo e rótulos em PT-BR.
- `lib/supabase`: clientes para browser, server e serviço.
- `types`: tipos de linhas do Supabase.
- `styles`: tokens do design system.
- `supabase`: migration e seed.
- `reports`: relatórios executivos.

## Riscos
- A qualidade dos dados depende do uso real e da foto enviada.
- O admin sem auth é suficiente para desenvolvimento, mas não para produção.
- O mapa pode precisar de clusterização quando a base crescer.
- Upload de imagem precisa ser monitorado em custo e desempenho.

## Próximos passos recomendados
- Implementar busca e filtros por cidade, bairro e combustível.
- Adicionar autenticação ao admin e ligar RLS de forma estrita.
- Criar estados de erro e loading mais robustos.
- Melhorar a tela do posto com resumo por combustível e tendência.
- Preparar observabilidade e métricas mínimas de uso.
