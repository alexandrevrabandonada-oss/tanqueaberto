-- Migration: 20260323_014_automated_rollout_schema.sql
-- Description: Adds operational and recommended state to groups and creates rollout logs.

-- 1. Update audit_station_groups
ALTER TABLE public.audit_station_groups 
ADD COLUMN IF NOT EXISTS operational_state TEXT DEFAULT 'closed' 
  CHECK (operational_state IN ('closed', 'limited_test', 'beta_open', 'monitoring', 'rollback')),
ADD COLUMN IF NOT EXISTS recommended_state TEXT DEFAULT NULL;

-- 2. Create territorial_rollout_logs
CREATE TABLE IF NOT EXISTS public.territorial_rollout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.audit_station_groups(id) ON DELETE CASCADE,
  previous_state TEXT NOT NULL,
  new_state TEXT NOT NULL,
  change_kind TEXT NOT NULL CHECK (change_kind IN ('automated', 'manual_override')),
  reason TEXT,
  actor_id uuid, -- Admin who performed override
  payload jsonb NOT NULL DEFAULT '{}'::jsonb, -- Evidence for the change (e.g. current metrics)
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Indices
CREATE INDEX IF NOT EXISTS idx_audit_station_groups_ops_state ON public.audit_station_groups(operational_state);
CREATE INDEX IF NOT EXISTS idx_territorial_rollout_logs_group ON public.territorial_rollout_logs(group_id, created_at DESC);

-- 4. RLS
ALTER TABLE public.territorial_rollout_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read rollout logs" ON public.territorial_rollout_logs;
CREATE POLICY "Admins can read rollout logs"
ON public.territorial_rollout_logs
FOR SELECT
USING (public.is_admin_email());

DROP POLICY IF EXISTS "Admins can manage rollout logs" ON public.territorial_rollout_logs;
CREATE POLICY "Admins can manage rollout logs"
ON public.territorial_rollout_logs
FOR ALL
USING (public.is_admin_email());

-- 5. Grants
GRANT SELECT, INSERT ON public.territorial_rollout_logs TO authenticated;
GRANT SELECT, INSERT ON public.territorial_rollout_logs TO service_role;
