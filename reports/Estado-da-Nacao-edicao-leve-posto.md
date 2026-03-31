# Estado da Nação: edição leve de posto

## Diagnóstico curto
A plataforma já tinha o papel restrito `station_editor` para semeadura. O que faltava era a extensão natural desse ciclo: corrigir postos existentes sem abrir o admin total, mantendo auditoria útil e sinal de duplicidade.

## O que foi entregue
- Nova rota restrita de edição leve em `/postos/[id]/editar`.
- Formulário mobile-first para editar apenas campos leves: apelido, bandeira, rua/trecho, bairro e ajuste fino de localização.
- Auditoria persistida por edição leve em `station_light_edits`.
- Leitura operacional do `station_editor` no painel admin.
- Persistência de vínculo com posto duplicado quando necessário.
- Revalidação de posto, painel de curadoria e painel de station editors após salvar.

## Antes / Depois
- Antes: correções de posto existente dependiam de rotas mais amplas e não tinham um trilho próprio para o papel estreito.
- Depois: `station_editor` ganhou uma página dedicada para edição leve, com revisão manual quando a alteração é sensível.

- Antes: não havia um histórico dedicado de edição leve por posto/editor.
- Depois: cada edição passa a registrar `before_snapshot`, `after_snapshot`, `diff`, `status`, `change_kind` e `reason`.

- Antes: vínculo de duplicidade ficava muito próximo da curadoria territorial, sem trilho próprio de edição.
- Depois: a edição leve consegue marcar duplicidade e salvar o vínculo sem abrir o admin total.

## Arquivos principais
- [app/postos/[id]/editar/page.tsx](C:/Projetos/Tanque%20Aberto/app/postos/[id]/editar/page.tsx)
- [app/postos/[id]/editar/actions.ts](C:/Projetos/Tanque%20Aberto/app/postos/[id]/editar/actions.ts)
- [components/stations/station-light-edit-form.tsx](C:/Projetos/Tanque%20Aberto/components/stations/station-light-edit-form.tsx)
- [lib/ops/station-light-edits.ts](C:/Projetos/Tanque%20Aberto/lib/ops/station-light-edits.ts)
- [supabase/migrations/20260330_024_station_light_edits.sql](C:/Projetos/Tanque%20Aberto/supabase/migrations/20260330_024_station_light_edits.sql)
- [app/postos/[id]/page.tsx](C:/Projetos/Tanque%20Aberto/app/postos/[id]/page.tsx)
- [app/admin/ops/station-editors/page.tsx](C:/Projetos/Tanque%20Aberto/app/admin/ops/station-editors/page.tsx)

## Validação
- `npm run build` passou.
- `npm run typecheck` passou.
- `npm run verify` passou.

## Leitura operacional
- O fluxo segue restrito ao papel `station_editor`.
- Mudanças leves e mudanças sensíveis continuam separadas.
- Duplicidade continua tratada como risco explícito, não como detalhe escondido.
- O admin total segue separado do papel estreito.
- O vínculo de duplicidade também pode ser removido; essa troca segue para revisão manual.

