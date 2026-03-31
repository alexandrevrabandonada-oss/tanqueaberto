-- Migration: 20260331_025_territory_workflow_states.sql
-- Description: Persistent operational workflow state per territory (city/neighborhood).

CREATE TABLE IF NOT EXISTS public.territory_workflow_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_key text NOT NULL UNIQUE,
  city text NOT NULL,
  city_slug text NOT NULL,
  neighborhood text NOT NULL DEFAULT '',
  workflow_state text NOT NULL CHECK (workflow_state IN ('em_mutirao', 'em_acompanhamento', 'concluido_por_enquanto')),
  note text,
  actor_id uuid,
  actor_email text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_territory_workflow_states_city_slug ON public.territory_workflow_states(city_slug, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_territory_workflow_states_updated_at ON public.territory_workflow_states(updated_at DESC);

ALTER TABLE public.territory_workflow_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read territory workflow states" ON public.territory_workflow_states;
CREATE POLICY "Admins can read territory workflow states"
ON public.territory_workflow_states
FOR SELECT
USING (public.is_admin_email());

DROP POLICY IF EXISTS "Admins can manage territory workflow states" ON public.territory_workflow_states;
CREATE POLICY "Admins can manage territory workflow states"
ON public.territory_workflow_states
FOR ALL
USING (public.is_admin_email());

GRANT SELECT, INSERT, UPDATE ON public.territory_workflow_states TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.territory_workflow_states TO service_role;
