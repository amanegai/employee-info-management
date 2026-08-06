-- BP求援（社内人員不足時に営業へ協力依頼）＋アプリ内通知

ALTER TABLE dispatch_project
    ADD COLUMN IF NOT EXISTS bp_help_requested BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE dispatch_project
    ADD COLUMN IF NOT EXISTS bp_help_requested_at TEXT;

ALTER TABLE dispatch_project
    ADD COLUMN IF NOT EXISTS bp_help_requested_by BIGINT REFERENCES auth_user(id) ON DELETE SET NULL;

ALTER TABLE dispatch_project
    ADD COLUMN IF NOT EXISTS bp_help_note TEXT;

ALTER TABLE dispatch_project
    ADD COLUMN IF NOT EXISTS bp_help_slots_needed INTEGER;

CREATE INDEX IF NOT EXISTS idx_dispatch_project_bp_help_open
    ON dispatch_project (bp_help_requested, updated_at DESC)
    WHERE bp_help_requested = TRUE;

CREATE TABLE IF NOT EXISTS app_notification (
    id                  BIGSERIAL PRIMARY KEY,
    recipient_user_id   BIGINT NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    type                TEXT NOT NULL,
    title               TEXT NOT NULL,
    body                TEXT,
    link_path           TEXT,
    project_id          BIGINT REFERENCES dispatch_project(id) ON DELETE CASCADE,
    actor_user_id       BIGINT REFERENCES auth_user(id) ON DELETE SET NULL,
    read_at             TEXT,
    resolved_at         TEXT,
    created_at          TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_app_notification_recipient_unread
    ON app_notification (recipient_user_id, created_at DESC)
    WHERE read_at IS NULL AND resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_app_notification_project_type
    ON app_notification (project_id, type);
