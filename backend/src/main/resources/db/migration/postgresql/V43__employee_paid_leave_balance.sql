-- 有給残台帳（今年度 / 前年度）。勤怠の paid_leave_remaining とは分離する。
CREATE TABLE IF NOT EXISTS employee_paid_leave_balance (
    employee_id              BIGINT PRIMARY KEY REFERENCES employee(id) ON DELETE CASCADE,
    current_year_remaining   INTEGER NOT NULL DEFAULT 0,
    previous_year_remaining  INTEGER NOT NULL DEFAULT 0,
    current_grant_date       DATE,
    previous_grant_date      DATE,
    current_grant_days       INTEGER NOT NULL DEFAULT 0,
    previous_grant_days      INTEGER NOT NULL DEFAULT 0,
    source                   TEXT NOT NULL DEFAULT 'GO_LIVE',
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_paid_leave_balance_grant
    ON employee_paid_leave_balance(current_grant_date);
