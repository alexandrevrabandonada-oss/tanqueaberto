# Estado da Nação - CTA Global Final

## Objetivo

Fechar a ultima passada do CTA global do Bomba Aberta para que a acao "Enviar preço" pareca parte nativa do shell, sem colisao visual, sem recorte lateral e sem a sensacao de elemento solto em mobile, tablet e desktop/PWA em janela larga.

## Resultado final

O CTA global agora tem duas presencas explicitamente separadas por viewport:

- Mobile: dock fixo acima da bottom nav, com largura controlada, safe area e espacamento lateral consistente.
- Tablet e desktop: CTA ancorado no header, dentro da coluna util do shell, sem ficar colado na borda direita e sem brigar com o conteudo principal.

O CTA contextual/integrado da home foi preservado como acao interna da tela, sem substituir o CTA global do shell.

## Arquivos centrais

- [components/layout/global-submit-cta.tsx](C:/Projetos/Tanque%20Aberto/components/layout/global-submit-cta.tsx)
- [components/layout/app-shell.tsx](C:/Projetos/Tanque%20Aberto/components/layout/app-shell.tsx)
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)
- [components/ui/fab.tsx](C:/Projetos/Tanque%20Aberto/components/ui/fab.tsx)

## Estrategia por viewport

### Mobile

- CTA global em dock fixo, acima da bottom nav.
- Largura maxima centrada de `480px`.
- Margem lateral de `16px`.
- Safe area inferior respeitada.
- Sem colisao com bottom nav.

### Tablet

- CTA global no header, alinhado a coluna do shell.
- Nao fica preso a borda lateral.
- Mantem acesso rapido sem disputar espaco com a leitura principal.

### Desktop

- CTA global no header, ancorado ao shell.
- Visual mais acabado e previsivel.
- Elimina a sensacao de FAB flutuante perdido em uma janela larga.

### PWA instalada / janela larga

- Usa o mesmo comportamento de tablet/desktop.
- O CTA fica integrado ao cabeçalho do produto, e nao como remendo sobreposto ao conteudo.

## Regras anti-colisao aplicadas

- Distancia maior da bottom nav no mobile.
- Safe area inferior considerada no dock.
- CTA do desktop ancorado ao header, nao ao canto da tela.
- Sem excesso de efeito visual que empurre a leitura para uma sensacao de sobreposicao solta.
- O CTA global nao compete com o CTA integrado da home.

## Validacao

### Build

- `npm run build` passou com sucesso depois do ajuste.
- Os warnings existentes de hooks continuam os mesmos e nao sao parte desta mudanca.

### Navegacao e toque

Foi executado um pass guiado no navegador local na rota `/sobre`, que usa o mesmo shell e evita o ruido da home.

Resultados medidos:

- Mobile: o clique no CTA global navegou para `/enviar`.
- Tablet: o clique no CTA global navegou para `/enviar`.
- Desktop: o clique no CTA global navegou para `/enviar`.
- Overlap com a bottom nav: `false` em todos os cenarios medidos.

### Metricas capturadas

- Mobile `390x844`
  - Placement: `dock mobile`
  - Margens: esquerda `16px`, direita `16px`, base `100px`
  - URL apos clique: `/enviar`
- Tablet `820x1180`
  - Placement: `header anchored`
  - Margens: esquerda `558px`, direita `119px`, base `1111px`
  - URL apos clique: `/enviar`
- Desktop `1440x900`
  - Placement: `header anchored`
  - Margens: esquerda `900px`, direita `389px`, base `829px`
  - URL apos clique: `/enviar`

## Screenshots comparativas

### Mobile

![CTA Global Mobile](C:/Projetos/Tanque%20Aberto/reports/cta-global-final/mobile.png)

### Tablet

![CTA Global Tablet](C:/Projetos/Tanque%20Aberto/reports/cta-global-final/tablet.png)

### Desktop

![CTA Global Desktop](C:/Projetos/Tanque%20Aberto/reports/cta-global-final/desktop.png)

## Leitura objetiva

O shell agora trata o CTA global como uma peça de sistema, nao como um elemento sobreposto improvisado.

- No mobile, ele fica acessivel e nao disputa com a bottom nav.
- No tablet e desktop, ele passa a morar no header e fica visualmente colado ao produto.
- Em janela larga/PWA, o visual deixa de parecer lateral demais ou desalinhado com a coluna util.

## Pendencias remanescentes

- O CTA integrado da home continua existindo por design, porque faz parte da superficie contextual da tela do mapa.
- Os warnings de hook no build seguem sem relacao com este CTA.
- O worktree do repositorio ainda tem mudancas paralelas nao consolidadas em outras areas.
