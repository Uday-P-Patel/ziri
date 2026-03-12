ALTER TABLE audit_logs ADD COLUMN auth_name TEXT;

ALTER TABLE user_agent_keys ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
CREATE INDEX IF NOT EXISTS idx_user_agent_keys_status ON user_agent_keys(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_email_hash_active ON auth(email_hash) WHERE status != 0;

ALTER TABLE schema_policy ADD COLUMN policy_id TEXT;
UPDATE schema_policy
SET policy_id = 'legacy-' || id
WHERE obj_type = 'policy' AND policy_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_schema_policy_policy_id
ON schema_policy(policy_id)
WHERE obj_type = 'policy' AND policy_id IS NOT NULL;

