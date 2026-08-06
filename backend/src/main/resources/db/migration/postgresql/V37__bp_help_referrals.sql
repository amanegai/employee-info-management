-- BP求援の臨時候補（履歴書付き）＋担当確認→顧客提出

ALTER TABLE dispatch_project
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES auth_user(id) ON DELETE SET NULL;

UPDATE dispatch_project
SET created_by = owner_user_id
WHERE created_by IS NULL
  AND owner_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS bp_help_referral (
    id                  BIGSERIAL PRIMARY KEY,
    project_id          BIGINT NOT NULL REFERENCES dispatch_project(id) ON DELETE CASCADE,
    candidate_name      TEXT NOT NULL,
    bp_company_name     TEXT,
    resume_file_id      BIGINT NOT NULL REFERENCES file_attachment(id) ON DELETE RESTRICT,
    note                TEXT,
    status              TEXT NOT NULL DEFAULT 'PENDING',
    submitted_by        BIGINT NOT NULL REFERENCES auth_user(id) ON DELETE RESTRICT,
    submitted_at        TEXT NOT NULL,
    reviewed_by         BIGINT REFERENCES auth_user(id) ON DELETE SET NULL,
    reviewed_at         TEXT,
    review_note         TEXT,
    submitted_to_client_by BIGINT REFERENCES auth_user(id) ON DELETE SET NULL,
    submitted_to_client_at TEXT,
    created_at          TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS'),
    updated_at          TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS'),
    CONSTRAINT chk_bp_help_referral_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUBMITTED', 'WITHDRAWN'))
);

CREATE INDEX IF NOT EXISTS idx_bp_help_referral_project_status
    ON bp_help_referral (project_id, status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_bp_help_referral_submitted_by
    ON bp_help_referral (submitted_by, submitted_at DESC);
