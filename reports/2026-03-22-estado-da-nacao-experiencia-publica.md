# Bomba Aberta - Estado da Nação

Data: 2026-03-22

## O que evoluiu nesta etapa
- A home deixou de ser uma vitrine estática e virou uma tela de consulta real.
- Foi adicionada busca funcional por posto, bairro e cidade.
- Foram adicionados filtros por combustível e por recência.
- O mapa ganhou mais protagonismo visual e agora responde ao recorte filtrado.
- A navegação pública foi limpa e o admin saiu da tabbar.
- A tela do posto ficou mais informativa, com resumo por combustível e leitura de tendência simples.
- O feed ganhou filtros públicos e estados vazios mais úteis.

## O que está funcionando hoje
- Leitura real de postos e preços no Supabase.
- Home com filtro por texto, combustível e recência.
- Mapa com pins reais e clique para abrir o posto.
- Feed real com filtros públicos.
- Tela de posto com destaque do preço mais recente, histórico e foto.
- Envio com foto para status `pending`.
- Admin mínimo funcional acessível só pela rota direta.
- PWA instalável e base visual consistente.

## O que ainda trava o produto
- Admin sem autenticação robusta ainda é provisório.
- A leitura de tendência ainda é simples e sem análise estatística.
- O mapa ainda não tem clusterização.
- Não há diferenciação forte de qualidade por confiança do dado ou por fonte.
- O offline/PWA ainda é básico.

## Riscos
- Se a base de postos crescer rápido, o mapa pode ficar poluído sem clusterização.
- Se o volume de envios aumentar, a moderação precisará de autenticação e RLS estrita.
- A experiência depende da participação popular e da qualidade das fotos enviadas.
- Sem métricas, fica difícil medir o uso real e priorizar correções.

## Próximos passos recomendados
- Proteger o admin com Supabase Auth e RLS.
- Adicionar filtros públicos também na tela do posto e mais atalhos de recência.
- Criar uma visão de tendência por combustível mais clara.
- Implementar clustering de markers no mapa.
- Preparar observabilidade mínima e métricas de uso.
