# Estado da Nacao - acesso facil station_editor

Data: 2026-04-01

## Diagnostico curto

O fluxo de acesso do station_editor estava funcional, mas com alta friccao para uso recorrente em campo.

Pontos principais:
- Entrada diaria dependia de links de convite/codigo em telas que misturavam ativacao e operacao.
- Nao havia uma rota curta dedicada para uso diario do editor.
- A UX de erro nao separava tao bem falhas de codigo/convite versus falhas de sessao.
- Persistencia existia, mas sem opcao explicita de "manter neste aparelho" para reforcar o caso de aparelho confiavel.

## Patch completo

### 1. Sessao persistente com opcao de aparelho confiavel

Arquivos:
- lib/ops/station-editor-invites.ts
- app/convite/station-editor/actions.ts
- components/station/station-editor-invite-accept-form.tsx

Mudancas:
- Incluida opcao keepOnDevice no fluxo de aceite de convite.
- Sessao padrao mantida em 30 dias e sessao em aparelho confiavel ampliada para 120 dias.
- Mensagens de erro refinadas para diferenciar:
  - convite/codigo nao encontrado
  - convite revogado/expirado/exaurido
  - falha de criacao de sessao
  - falha de claim de convite
- Checkbox "Manter neste aparelho confiavel" adicionado na ativacao (default ligado).

Garantia de seguranca:
- Revogacao por admin continua efetiva, pois a validacao da sessao consulta estado real da sessao/convite no backend.
- Papel continua estreito: station_editor sem escalada para admin total.

### 2. Rota curta /editor para uso diario

Arquivos:
- app/editor/page.tsx (novo)
- app/postos/page.tsx
- app/se/[token]/page.tsx
- app/convite/station-editor/page.tsx
- lib/auth/admin.ts
- lib/ops/station-editor-invites.ts

Mudancas:
- Nova porta de entrada curta: /editor.
- Comportamento:
  - com sessao valida (ou admin autenticado): redireciona para /postos
  - sem sessao: mostra ativacao por convite/codigo na propria /editor
- /postos sem sessao agora redireciona para /editor (centralizacao do fluxo).
- /se/[token] agora redireciona para /editor?token=...
- /convite/station-editor agora redireciona para /editor preservando token/code.
- Link de convite por codigo passa a apontar para /editor?code=...
- Fallback de sessao expirada em guards de station_editor passa para /editor?error=session_expired

### 3. Primeira ativacao mais robusta

Arquivos:
- app/convite/station-editor/actions.ts
- app/editor/page.tsx
- components/station/station-editor-invite-accept-form.tsx

Mudancas:
- Fluxo aceita link (token) e codigo.
- Mensagens de erro orientadas por causa real.
- Mensagem de sessao expirada exibida de forma explicita na porta /editor.
- Redirecionamento de sucesso passa por /editor?notice=invite_accepted antes de abrir /postos.

### 4. Atalho de tela inicial (Android)

Arquivo:
- app/editor/page.tsx

Mudanca:
- Bloco dedicado com copy curta:
  - "Salvar Editor de Postos na tela inicial"
  - Instrucao Android Chrome: menu de tres pontos > Adicionar a tela inicial

## Antes e depois

Antes:
- Uso recorrente podia depender de link/codigo e de fluxo espalhado entre /postos e /convite.
- Recuperacao de sessao e ativacao ficavam menos previsiveis para operador de campo.
- Persistencia sem reforco explicito de confianca no aparelho.

Depois:
- Entrada diaria simples: /editor como porta unica.
- Sessao persistente com modo confiavel (120 dias) para reduzir relogin/reativacao frequente.
- Convite/codigo ficam para primeira ativacao e recuperacao.
- Erros explicam melhor quando problema e codigo/convite versus sessao.
- UX mobile-first com incentivo direto para atalho na tela inicial.

## Notas finais

- Seguranca e revogacao administrativa foram preservadas no desenho.
- Mudanca focada em reducao drastica de friccao operacional para pessoas de confianca no celular.
