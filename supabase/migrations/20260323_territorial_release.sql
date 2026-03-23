-- Migration for Territorial Release Control

-- Add columns to audit_station_groups
ALTER TABLE audit_station_groups 
ADD COLUMN IF NOT EXISTS release_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS rollout_notes TEXT DEFAULT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_audit_station_groups_release ON audit_station_groups(release_status, is_published);

-- Comments
COMMENT ON COLUMN audit_station_groups.release_status IS 'Progresso do rollout: ready, validating, limited, hidden';
COMMENT ON COLUMN audit_station_groups.is_published IS 'Visibilidade pública no beta de rua';
