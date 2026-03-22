# Bomba Aberta - Estado Atual do Produto

Data: 2026-03-22

## Resumo executivo
O Bomba Aberta saiu da fase de scaffold e está, hoje, numa base funcional de MVP. O app já entrega mapa, consulta de postos, leitura de preços aprovados, histórico recente, envio de novos preços com foto e fila de moderação no admin. A home também já tem busca por posto, bairro e cidade.

## O que está funcionando
- Home com mapa real do Sul Fluminense usando Leaflet + OpenStreetMap.
- Busca por posto, bairro e cidade na home.
- Listagem real de postos ativos vindos do Supabase.
- Consulta de preços aprovados por posto e no feed.
- Tela de posto com dados reais, últimos preços e histórico recente.
- Fluxo de envio real com foto, preço, apelido opcional e status `pending`.
- Upload de imagens no Supabase Storage.
- Admin mínimo funcional com fila de pendências e ações de aprovar/rejeitar.
- PWA instalável com manifest, service worker e ícones placeholders.
- Design system base com identidade própria do VR Abandonada.
- Camada técnica separada em `lib/data`, `lib/format`, `lib/supabase`, `types` e componentes reutilizáveis.

## Estrutura atual de pastas
- `app/`: rotas do produto.
- `components/`: shell, mapa, home, formulário, posto e UI base.
- `lib/data`: consultas e composição das visões do app.
- `lib/format`: moeda, tempo e rótulos em PT-BR.
- `lib/supabase`: clientes server, browser e service role.
- `types`: tipos do Supabase e tipos de domínio.
- `styles`: tokens visuais do produto.
- `supabase`: migration e seed.
- `reports`: relatórios executivos da evolução do projeto.

## Pendências
- Autenticação real para o admin.
- RLS aplicada de forma rígida no Supabase.
- Estados de loading e erro mais refinados em todas as rotas.
- Melhorias de busca e filtros por combustível.
- Clustering de markers quando a base crescer.
- Métricas de uso e observabilidade mínima.
- Consolidação do offline/PWA para cenários sem rede.

## Riscos
- Qualidade dos dados depende da participação popular e da revisão de pendências.
- O admin sem auth é aceitável só como etapa provisória de desenvolvimento.
- Upload de fotos pode gerar custo e precisa de controle quando o uso escalar.
- O mapa pode perder legibilidade se o número de postos crescer sem clustering.

## Estado técnico
- O `typecheck` foi ajustado para gerar tipos do Next antes de rodar o TypeScript.
- `build`, `lint` e `typecheck` estão validados na base atual.
- O app está pronto para evoluir sem reescrever a fundação.

## Próximos passos recomendados
- Adicionar filtros por combustível e ordenação por recência.
- Proteger o admin com autenticação Supabase.
- Ligar RLS e perfis administrativos no banco.
- Melhorar a tela do posto com resumo por combustível e tendência.
- Preparar métricas básicas e monitoramento do fluxo de envio.
