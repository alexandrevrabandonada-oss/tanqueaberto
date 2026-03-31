-- Migration: 20260331_026_territory_workflow_coordination.sql
-- Description: Adds lightweight responsibility and due-date fields to territory workflow states.

ALTER TABLE public.territory_workflow_states
  ADD COLUMN IF NOT EXISTS responsible_role text NOT NULL DEFAULT 'operacao_admin',
  ADD COLUMN IF NOT EXISTS due_kind text NOT NULL DEFAULT 'sem_prazo',
  ADD COLUMN IF NOT EXISTS due_at timestamptz;

DO $$
BEGIN
  ALTER TABLE public.territory_workflow_states
    ADD CONSTRAINT territory_workflow_states_responsible_role_check
    CHECK (responsible_role IN ('station_editor', 'curadoria', 'operacao_admin'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.territory_workflow_states
    ADD CONSTRAINT territory_workflow_states_due_kind_check
    CHECK (due_kind IN ('hoje', 'esta_semana', 'sem_prazo'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_territory_workflow_states_due_at ON public.territory_workflow_states(due_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_territory_workflow_states_responsible_role ON public.territory_workflow_states(responsible_role, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_territory_workflow_states_due_kind ON public.territory_workflow_states(due_kind, updated_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.territory_workflow_states TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.territory_workflow_states TO service_role;
