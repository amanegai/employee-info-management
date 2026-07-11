CREATE TABLE IF NOT EXISTS employee_monthly_expense (
    id                      BIGSERIAL PRIMARY KEY,
    employee_id             BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    target_month            VARCHAR(7) NOT NULL,
    periodic_pass_allowance INTEGER NOT NULL DEFAULT 0,
    commuter_individual_allowance INTEGER NOT NULL DEFAULT 0,
    business_expense_allowance INTEGER NOT NULL DEFAULT 0,
    source_file_name        VARCHAR(255),
    source_file_id          BIGINT REFERENCES file_attachment(id) ON DELETE SET NULL,
    imported_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_employee_monthly_expense UNIQUE (employee_id, target_month)
);

CREATE INDEX IF NOT EXISTS idx_employee_monthly_expense_employee
    ON employee_monthly_expense(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_monthly_expense_month
    ON employee_monthly_expense(target_month);
