# Estado da Nacao - Convite Leve para station_editor

Data: 2026-03-31

## 1) Diagnostico Curto

O fluxo atual de station_editor estava acoplado ao login formal do Supabase Auth (email + senha), apesar do papel ja ser estreito e orientado a operacao de campo. Isso criava friccao para entrada por WhatsApp e dificultava ativacao rapida por convite.

A principal lacuna era de produto e de arquitetura de sessao:
- havia controle de papel, mas nao havia objeto de convite dedicado com expiracao/revogacao;
- nao havia sessao leve por aparelho para station_editor;
- a autorizacao das rotas /postos/cadastrar e /postos/[id]/editar aceitava apenas sessao Auth tradicional.

## 2) Patch Completo

### Banco / Schema

Foi adicionada migration dedicada:
- supabase/migrations/20260331_028_station_editor_invites.sql

Novas tabelas:
- public.station_editor_invites
- public.station_editor_sessions

Capacidades adicionadas:
- token seguro de convite (invite_token)
- codigo curto opcional (invite_code)
- validade (expires_at)
- limite de uso (max_uses/use_count, incluindo uso unico)
- status de ciclo de vida (pendente, aceito, revogado, expirado)
- auditoria de criacao/aceite/revogacao
- revogacao de sessoes ativas vinculadas ao convite

Compatibilidade:
- removido FK de station_light_edits.editor_id -> auth.users para permitir auditoria de sessao leve sem conta formal.

### Backend de convite/sessao

Novo modulo:
- lib/ops/station-editor-invites.ts

Implementado:
- geracao de token seguro e codigo curto
- emissao de convite com TTL e maxUses
- leitura de painel com totais por status
- aceite de convite com validacoes de seguranca
- criacao de sessao restrita por aparelho (token em hash)
- revogacao de convite com revogacao de sessoes vinculadas
- validacao de sessao leve ativa/expirada/revogada

Novo modulo de cookie de sessao:
- lib/auth/station-editor-session.ts

Implementado:
- set/clear/get de cookie httpOnly para sessao station_editor

### Autorizacao

Atualizado:
- lib/auth/admin.ts

Mudanca principal:
- requireStationEditorUser agora aceita:
  1) fluxo tradicional (Auth + allowlist), ou
  2) sessao leve por convite no cookie.

Importante:
- requireAdminUser permanece estrito (sem aceitar sessao leve), mantendo separacao entre admin total e papel estreito.

### Aceitacao do convite (mobile-first)

Novas rotas/telas:
- app/convite/station-editor/page.tsx
- app/se/[token]/page.tsx (link curto)

Nova action:
- app/convite/station-editor/actions.ts

Novo formulario client:
- components/station/station-editor-invite-accept-form.tsx

Fluxo implementado:
- abrir link curto ou entrar com codigo
- informar nome/apelido operacional
- aceitar convite
- criar sessao leve por aparelho
- entrar direto em /postos/cadastrar

### Admin / Ops (station_editors)

Atualizado:
- app/admin/actions.ts
- app/admin/ops/station-editors/page.tsx
- components/ui/copy-text-button.tsx

Funcionalidades adicionadas no painel:
- gerar convite station_editor
- configurar validade (horas)
- configurar limite de usos (inclui uso unico)
- copiar link
- copiar codigo
- revogar convite
- listar convites com status (pendente/aceito/revogado/expirado)
- manter trilha de auditoria (quem criou, quem aceitou, quando)

### UX operacional

Atualizado:
- app/postos/cadastrar/page.tsx
- app/admin/login/page.tsx

Ajustes:
- aviso de sessao leve ativa apos aceite do convite
- atalho "Entrar por convite" na tela de login restrito

## 3) Antes / Depois

Antes:
- station_editor dependia de login pesado por email/senha;
- nao existia convite dedicado com token/codigo/validade/revogacao;
- sem sessao leve por aparelho para operacao de campo.

Depois:
- admin gera convite leve para station_editor com token seguro, codigo curto, validade e limite de uso;
- aceite mobile-first por link curto ou codigo;
- sessao restrita leve no aparelho libera apenas fluxos de semeadura/edicao;
- revogacao no admin encerra acesso leve vinculado;
- admin total continua separado e protegido.

## 4) Seguranca

Medidas aplicadas:
- token de convite de alta entropia
- expiracao obrigatoria
- controle de uso (inclui uso unico)
- revogacao manual
- sessao com expiracao e status ativo/revogado/expirado
- papel station_editor sempre estreito
- admin total sem fallback para sessao leve

## 5) Validacao Tecnica

Executado:
- npm run build
- npm run typecheck
- npm run verify

Resultado:
- sem erros de compilacao/tipagem no patch
- fluxo pronto para deploy com controle de convite e sessao leve
