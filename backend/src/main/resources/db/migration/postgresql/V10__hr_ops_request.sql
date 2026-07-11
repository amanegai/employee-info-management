CREATE TABLE IF NOT EXISTS hr_ops_request (
    id              BIGSERIAL PRIMARY KEY,
    request_type    TEXT NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    employee_id     BIGINT REFERENCES employee(id) ON DELETE SET NULL,
    requester_id    BIGINT NOT NULL REFERENCES auth_user(id),
    status          TEXT NOT NULL DEFAULT 'DRAFT',
    assigned_to     BIGINT REFERENCES auth_user(id),
    due_date        TEXT,
    hr_notes        TEXT,
    reject_reason   TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    submitted_at    TEXT,
    resolved_at     TEXT,
    resolved_by     BIGINT REFERENCES auth_user(id)
);

CREATE INDEX IF NOT EXISTS idx_hr_ops_request_status ON hr_ops_request(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_hr_ops_request_requester ON hr_ops_request(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_ops_request_type ON hr_ops_request(request_type);
