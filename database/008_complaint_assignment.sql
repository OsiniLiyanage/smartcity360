ALTER TABLE complaint ADD COLUMN IF NOT EXISTS assigned_user_id BIGINT REFERENCES app_user(id);
CREATE INDEX IF NOT EXISTS complaint_assigned_user_idx ON complaint(assigned_user_id, updated_at DESC);
