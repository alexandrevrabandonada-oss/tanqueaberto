# Estado da Nação — CTA Global Desktop Final de Verdade

Data: 2026-03-26

## Objetivo
Eliminar a sensação de CTA flutuante solto em desktop, tablet landscape e PWA wide, mantendo acessível o envio rápido sem competir com CTAs contextuais.

## O que mudou
- O CTA global deixou de usar peça lateral boiando no desktop.
- O mobile mantém o dock fixo.
- O tablet, desktop e PWA wide passam a usar um strip integrado ao shell.
- A rota `/enviar` não exibe o CTA global, para evitar duplicação com o fluxo principal de envio.
- Os CTAs contextuais da home, atualizações e Hub foram rebaixados ou escondidos no desktop para não competir com o CTA global.

## Arquivos principais
- [components/layout/global-submit-cta.tsx](C:/Projetos/Tanque%20Aberto/components/layout/global-submit-cta.tsx)
- [components/layout/app-shell.tsx](C:/Projetos/Tanque%20Aberto/components/layout/app-shell.tsx)
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)
- [app/atualizacoes/page.tsx](C:/Projetos/Tanque%20Aberto/app/atualizacoes/page.tsx)
- [components/hub/collector-hub.tsx](C:/Projetos/Tanque%20Aberto/components/hub/collector-hub.tsx)

## Regra final por breakpoint
- Mobile: usa dock fixo, sem CTA lateral.
- Tablet: usa strip integrado ao shell, sem flutuação lateral.
- Desktop: usa strip integrado ao shell, sem botão boiando.
- PWA wide: usa strip integrado ao shell, sem botão boiando.

## Hierarquia final
- CTA global: principal, integrado ao shell.
- CTA contextual da home: visível no mobile, ocultado no desktop quando competir com o global.
- CTA contextual das atualizações: visível no mobile, ocultado no desktop quando competir com o global.
- CTA contextual do Hub: o botão secundário de envio foi escondido no desktop e o próximo passo passou a rebaixar para secondary quando aponta para `/enviar`.

## Rotas cobertas
- `/`
- `/atualizacoes`
- `/enviar`
- `/hub`

## Validação
- `npm run build` passou.
- O gate visual não pôde rodar no sandbox porque a abertura do servidor local falha com `spawn EPERM`.

## Screenshots
- Não foram geradas nesta passagem por limitação do ambiente local.
- A matriz continua definida para mobile, tablet, desktop e PWA wide, mas precisa ser executada em um ambiente com permissão de spawn para capturar os quadros.

## Veredito
HOLD.

Motivo: o patch de código está aplicado e o build está OK, mas a captura visual comparativa ainda depende de execução fora deste sandbox.
