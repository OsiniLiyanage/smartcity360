ALTER TABLE complaint ADD COLUMN IF NOT EXISTS reopen_requested BOOLEAN NOT NULL DEFAULT false;
-- Account display names accept up to 100 characters, including resident message authors.
ALTER TABLE complaint_event ALTER COLUMN actor TYPE VARCHAR(100);
