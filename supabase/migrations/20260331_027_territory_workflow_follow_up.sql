-- Migration: 20260331_027_territory_workflow_follow_up.sql
-- Description: Adds nominal owner, short block reason and follow-up timestamp to territory workflow states.

ALTER TABLE public.territory_workflow_states
  ADD COLUMN IF NOT EXISTS responsible_name text,
  ADD COLUMN IF NOT EXISTS block_kind text,
  ADD COLUMN IF NOT EXISTS follow_up_at timestamptz;

DO $$
BEGIN
  ALTER TABLE public.territory_workflow_states
    ADD CONSTRAINT territory_workflow_states_block_kind_check
    CHECK (block_kind IS NULL OR block_kind IN ('aguardando_semeadura', 'aguardando_curadoria', 'aguardando_editor', 'sem_prioridade_agora'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_territory_workflow_states_follow_up_at ON public.territory_workflow_states(follow_up_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_territory_workflow_states_block_kind ON public.territory_workflow_states(block_kind, updated_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.territory_workflow_states TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.territory_workflow_states TO service_role;