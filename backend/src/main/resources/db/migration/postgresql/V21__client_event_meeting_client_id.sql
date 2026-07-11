ALTER TABLE client_event
    ADD COLUMN IF NOT EXISTS client_id BIGINT REFERENCES dispatch_client(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_client_event_client_id ON client_event(client_id);

UPDATE client_event ce
SET client_id = (
    SELECT c.id
    FROM dispatch_client c
    WHERE LOWER(TRIM(c.name)) = LOWER(TRIM(ce.client_name))
      AND c.deleted_at IS NULL
    ORDER BY c.id
    LIMIT 1
)
WHERE ce.client_id IS NULL;

ALTER TABLE client_meeting
    ADD COLUMN IF NOT EXISTS client_id BIGINT REFERENCES dispatch_client(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_client_meeting_client_id ON client_meeting(client_id);

UPDATE client_meeting cm
SET client_id = (
    SELECT c.id
    FROM dispatch_client c
    WHERE LOWER(TRIM(c.name)) = LOWER(TRIM(cm.client_name))
      AND c.deleted_at IS NULL
    ORDER BY c.id
    LIMIT 1
)
WHERE cm.client_id IS NULL;
