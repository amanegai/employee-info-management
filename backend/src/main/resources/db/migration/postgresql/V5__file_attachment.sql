CREATE TABLE IF NOT EXISTS file_attachment (
    id               BIGSERIAL PRIMARY KEY,
    original_name    TEXT NOT NULL,
    content_type     TEXT,
    size_bytes       BIGINT NOT NULL,
    stored_name      TEXT NOT NULL UNIQUE,
    description      TEXT,
    uploaded_by      BIGINT REFERENCES auth_user(id) ON DELETE SET NULL,
    uploaded_by_name TEXT NOT NULL,
    created_at       TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS'),
    deleted_at       TEXT
);

CREATE INDEX IF NOT EXISTS idx_file_attachment_created ON file_attachment(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_attachment_deleted ON file_attachment(deleted_at);
