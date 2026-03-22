# Estado da Nação — Launch Gate Pré-Beta

Data: 22 de março de 2026

## O que mudou na experiência

O Bomba Aberta passou a separar explicitamente duas camadas que antes ficavam misturadas na leitura pública:

- `posto cadastrado no território`
- `posto com preço recente aprovado`

Isso aparece no mapa, na home, no feed, na tela do posto e na nova visão pública de lacunas. O resultado é uma experiência mais honesta: o app deixa de parecer vazio quando há base territorial, mas ainda falta massa de reports.

## Como a UI diferencia cadastro territorial de preço recente

### Estado 1: posto cadastrado

O posto existe na base oficial e pode aparecer no mapa/lista, desde que tenha coordenada pública aceitável.

Sinais na UI:

- badge `Posto cadastrado`
- status `Preço recente` ou `Sem atualização recente`
- pin no mapa mesmo sem report recente, se a coordenada for confiável

### Estado 2: posto com preço recente

O posto tem pelo menos um report aprovado dentro da janela de recência usada pelo produto.

Sinais na UI:

- destaque visual mais forte no mapa
- badge `Preço recente`
- recência explícita no card e na tela do posto

### Estado 3: posto sem atualização recente

O posto existe, mas ainda não tem preço recente aprovado.

Sinais na UI:

- badge `Sem atualização recente`
- blocos vazios com CTA de contribuição
- entrada na lista `/postos/sem-atualizacao`

### Estado 4: localização em revisão

Quando a coordenada ainda é fraca ou está em revisão territorial, o posto segue protegido de exibição indevida no mapa.

Sinais na UI:

- aviso `Localização em revisão`
- exclusão de pins inválidos do mapa

## O que foi preparado para o beta

- Mapa útil mesmo com massa parcial de reports.
- Home com leitura rápida do que existe, do que está recente e do que ainda falta.
- Estados vazios orientados à ação, não só à informação.
- Lista pública de postos sem preço recente.
- Toggle simples para reduzir ruído na primeira impressão.
- Fixtures de preview/dev para validar cenário de beta sem inventar dado público.
- Checklist de launch gate documentado em [docs/beta-launch-gate.md](/C:/Projetos/Tanque%20Aberto/docs/beta-launch-gate.md).

## O que ainda bloqueia o beta

- A massa de reports recentes ainda é desigual entre cidades.
- Parte da base depende de cobertura territorial melhor e revisão manual contínua.
- O valor público do produto cresce mais rápido que a densidade real de preços em algumas áreas.
- O agendamento operacional depende de cron/job estar ativo em produção.

## Riscos remanescentes

- Se a base crescer sem densidade de reports, o mapa pode continuar vivo, mas com pouca utilidade prática em algumas áreas.
- Se a leitura de recência não for reforçada ao longo do tempo, o usuário pode ver muitos postos cadastrados e poucos preços realmente úteis.
- Fixtures de preview precisam ficar claramente isoladas do ambiente público.

## Próximos passos recomendados

1. Rodar o beta fechado com a nova separação entre cadastro e preço recente.
2. Acompanhar quais cidades têm mais postos cadastrados do que reportados.
3. Priorizar ativação de coleta nas áreas mais fracas.
4. Medir se a nova lista de lacunas aumenta o envio de preços.
5. Manter o launch gate revisado semanalmente antes de expandir acesso.

## Arquivos-chave desta etapa

- [components/home/home-browser.tsx](/C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)
- [components/map/station-map.tsx](/C:/Projetos/Tanque%20Aberto/components/map/station-map.tsx)
- [components/station/station-card.tsx](/C:/Projetos/Tanque%20Aberto/components/station/station-card.tsx)
- [components/feed/feed-browser.tsx](/C:/Projetos/Tanque%20Aberto/components/feed/feed-browser.tsx)
- [app/postos/[id]/page.tsx](/C:/Projetos/Tanque%20Aberto/app/postos/[id]/page.tsx)
- [app/postos/sem-atualizacao/page.tsx](/C:/Projetos/Tanque%20Aberto/app/postos/sem-atualizacao/page.tsx)
- [lib/dev/preview-data.ts](/C:/Projetos/Tanque%20Aberto/lib/dev/preview-data.ts)
- [lib/data/queries.ts](/C:/Projetos/Tanque%20Aberto/lib/data/queries.ts)
