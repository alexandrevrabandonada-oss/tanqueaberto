alter table public.collector_trust
  alter column trust_stage set default 'novo';

alter table public.collector_trust
  drop constraint if exists collector_trust_trust_stage_check;

alter table public.collector_trust
  add constraint collector_trust_trust_stage_check
  check (trust_stage in (
    'novo',
    'confiável',
    'muito_confiável',
    'em_revisão',
    'bloqueado',
    'new',
    'trusted',
    'review_needed',
    'blocked'
  ));

