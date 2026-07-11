ALTER TABLE dispatch_project
    ADD COLUMN IF NOT EXISTS client_id BIGINT REFERENCES dispatch_client(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dispatch_project_client_id ON dispatch_project(client_id);

UPDATE dispatch_project p
SET client_id = (
    SELECT c.id
    FROM dispatch_client c
    WHERE LOWER(TRIM(c.name)) = LOWER(TRIM(p.client_name))
      AND c.deleted_at IS NULL
    ORDER BY c.id
    LIMIT 1
)
WHERE p.client_id IS NULL;
