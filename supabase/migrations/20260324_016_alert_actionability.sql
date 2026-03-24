-- Migration: 20260324_016_alert_actionability.sql
-- Description: Adds module and cause columns to operational_alerts for better Command Center actionability.

alter table public.operational_alerts 
add column if not exists module text,
add column if not exists cause text;
