# Estado da Nacao - Consolidacao do Shell Largo Final

Data: 2026-03-25
Projeto: Bomba Aberta

## Objetivo
Consolidar a shell larga para desktop, tablet landscape e PWA wide sem perder a clareza mobile-first.

## O que foi ajustado
- A largura maxima real do shell foi aberta para telas largas, com teto maior em `xl` e `2xl`.
- O CTA global deixou de parecer um elemento isolado no canto e passou a nascer do shell em duas formas:
  - bloco nativo no desktop largo
  - pill de header no intervalo intermediario
  - dock fixa apenas no mobile
- A home perdeu o FAB interno redundante no topo do mapa e ganhou uma acao inline mais integrada ao card.
- Os grids de `home`, `atualizacoes`, `enviar` e `Meu Hub` receberam faixas largas mais consistentes.
- O Hub ganhou rails e colunas um pouco mais generosas para evitar compressao visual.
- A bottom nav foi alinhada a um frame largo maior para nao parecer uma barra de outro sistema.

## Arquivos principais
- [components/layout/app-shell.tsx](C:/Projetos/Tanque%20Aberto/components/layout/app-shell.tsx)
- [components/layout/global-submit-cta.tsx](C:/Projetos/Tanque%20Aberto/components/layout/global-submit-cta.tsx)
- [components/layout/bottom-nav.tsx](C:/Projetos/Tanque%20Aberto/components/layout/bottom-nav.tsx)
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)
- [components/hub/collector-hub.tsx](C:/Projetos/Tanque%20Aberto/components/hub/collector-hub.tsx)
- [app/atualizacoes/page.tsx](C:/Projetos/Tanque%20Aberto/app/atualizacoes/page.tsx)
- [app/enviar/page.tsx](C:/Projetos/Tanque%20Aberto/app/enviar/page.tsx)
- [scripts/capture-shell-largo-final.cjs](C:/Projetos/Tanque%20Aberto/scripts/capture-shell-largo-final.cjs)

## Regra final do shell largo
- Se houver rail util, a tela usa duas zonas.
- Se o rail for fraco ou inexistente, a coluna principal cresce para ocupar a largura disponivel.
- O CTA global nao fica solto fora do eixo.
- A interface continua mobile-first, mas desktop largo deixa de parecer mobile centralizado com sobra preta.

## Validacao tecnica
- `npm run build` passou.
- Os warnings antigos de hooks continuam presentes, mas nao quebram o build.
- A falha de `next start` / `next dev` neste sandbox persiste por `spawn EPERM` dentro do runtime do Next.

## Screenshots
### Antes
As referencias visuais anteriores relevantes estao nos pacotes ja gerados:
- [reports/layout-largo-intencional](C:/Projetos/Tanque%20Aberto/reports/layout-largo-intencional)
- [reports/hub-largo-5-0](C:/Projetos/Tanque%20Aberto/reports/hub-largo-5-0)
- [reports/cta-global-final](C:/Projetos/Tanque%20Aberto/reports/cta-global-final)

### Depois
Nao foi possivel gerar uma nova rodada local de screenshots porque o runtime do Next encerra com `spawn EPERM` neste ambiente ao subir `next start` / `next dev`.

## Leitura objetiva
- A shell agora tem um eixo visual mais largo e consistente.
- O CTA global ficou acoplado ao sistema de shell, nao mais separado como remendo visual.
- Home, feed, envio e hub passam a usar a largura com mais intencao e menos vazio lateral.

## Pendencia
- Gerar nova rodada de screenshots fora deste sandbox, ou em um preview que aceite subida do runtime do Next sem `spawn EPERM`.
