insert into public.sys_config (key, value)
values (
  'progressive_trust_rollout',
  jsonb_build_object(
    'phase', 2,
    'fastLaneEnabled', true,
    'autoApprovalEnabled', false,
    'notes', 'Fase 2 operacional como padrao seguro'
  )
)
on conflict (key) do nothing;

update public.sys_config
set value = coalesce(value, '{}'::jsonb) || jsonb_build_object(
  'disable_progressive_trust', coalesce((value->>'disable_progressive_trust')::boolean, false)
),
updated_at = timezone('utc', now())
where key = 'kill_switches';

update public.sys_config
set value = (value - 'phase' - 'fastLaneEnabled' - 'autoApprovalEnabled') || jsonb_build_object(
  'phase', coalesce((value->>'phase')::integer, 2),
  'fastLaneEnabled', coalesce((value->>'fastLaneEnabled')::boolean, true),
  'autoApprovalEnabled', coalesce((value->>'autoApprovalEnabled')::boolean, false)
),
updated_at = timezone('utc', now())
where key = 'progressive_trust_rollout';