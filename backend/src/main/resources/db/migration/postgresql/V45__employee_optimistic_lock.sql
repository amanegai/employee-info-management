-- 社員楽観ロック・最終更新情報
ALTER TABLE employee
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE employee
    ADD COLUMN IF NOT EXISTS updated_at TEXT;

ALTER TABLE employee
    ADD COLUMN IF NOT EXISTS updated_by BIGINT REFERENCES auth_user(id) ON DELETE SET NULL;

UPDATE employee
SET updated_at = COALESCE(NULLIF(TRIM(updated_at), ''), created_at,
                          to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS')),
    version = COALESCE(version, 1)
WHERE updated_at IS NULL OR TRIM(updated_at) = '';

CREATE INDEX IF NOT EXISTS idx_employee_updated_at ON employee(updated_at);
