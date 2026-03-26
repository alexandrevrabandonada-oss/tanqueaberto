# Estado da Nação — Navegação Desktop Coerente

Data: 2026-03-26

## Veredito

HOLD parcial por falta de screenshots geradas nesta sessão. O layout e o comportamento por breakpoint foram ajustados e o build passou.

## Regra final por breakpoint

- Mobile: bottom nav fixa atual, com barra grossa e toque grande.
- Tablet: mesma navegação, mas com densidade intermediária e menos peso visual.
- Desktop / wide: nav slim integrada ao shell, menor altura, menos padding vertical e distribuição horizontal mais limpa.

## O que mudou

- A bottom nav deixou de se comportar como uma barra mobile ampliada em `xl+`.
- O shell ganhou menos folga inferior no desktop para a navegação slim.
- O estado ativo continua forte com fundo de destaque e tipografia mais pesada.

## Arquivos tocados

- [components/layout/bottom-nav.tsx](C:/Projetos/Tanque%20Aberto/components/layout/bottom-nav.tsx)
- [components/layout/app-shell.tsx](C:/Projetos/Tanque%20Aberto/components/layout/app-shell.tsx)

## Observações

- `npm run build` passou.
- Continuam apenas warnings antigos de hooks e o aviso conhecido do `/hub` dinâmico.
- Não consegui gerar screenshots locais nesta sessão porque o ambiente aqui não sobe um browser de captura com segurança suficiente para a matriz visual.
