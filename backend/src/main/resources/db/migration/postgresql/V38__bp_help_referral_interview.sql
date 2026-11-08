-- 臨時候補：顧客提出後の面談〜採用確定

ALTER TABLE bp_help_referral
    DROP CONSTRAINT IF EXISTS chk_bp_help_referral_status;

ALTER TABLE bp_help_referral
    ADD COLUMN IF NOT EXISTS interview_at TEXT,
    ADD COLUMN IF NOT EXISTS close_reason TEXT,
    ADD COLUMN IF NOT EXISTS hired_employee_id BIGINT REFERENCES employee(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS hired_at TEXT,
    ADD COLUMN IF NOT EXISTS hired_by BIGINT REFERENCES auth_user(id) ON DELETE SET NULL;

ALTER TABLE bp_help_referral
    ADD CONSTRAINT chk_bp_help_referral_status
        CHECK (status IN (
            'PENDING',
            'APPROVED',
            'REJECTED',
            'SUBMITTED',
            'INTERVIEW_SCHEDULED',
            'INTERVIEWING',
            'HIRED',
            'CLIENT_REJECTED',
            'DECLINED',
            'WITHDRAWN'
        ));

CREATE INDEX IF NOT EXISTS idx_bp_help_referral_hired_employee
    ON bp_help_referral (hired_employee_id)
    WHERE hired_employee_id IS NOT NULL;
