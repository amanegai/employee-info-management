CREATE TABLE IF NOT EXISTS dispatch_project (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name         TEXT NOT NULL,
    project_name        TEXT NOT NULL,
    project_text        TEXT,
    required_skills     TEXT,
    optional_skills     TEXT,
    billing_unit_price  INTEGER,
    work_location       TEXT,
    expected_start_date TEXT,
    expected_end_date   TEXT,
    headcount_required  INTEGER NOT NULL DEFAULT 1,
    headcount_filled    INTEGER NOT NULL DEFAULT 0,
    status              TEXT NOT NULL DEFAULT 'OPEN',
    owner_user_id       INTEGER REFERENCES auth_user(id),
    notes               TEXT,
    created_at          TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_dispatch_project_client ON dispatch_project(client_name);
CREATE INDEX IF NOT EXISTS idx_dispatch_project_status ON dispatch_project(status);
CREATE INDEX IF NOT EXISTS idx_dispatch_project_start ON dispatch_project(expected_start_date);

CREATE TABLE IF NOT EXISTS project_candidate (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id          INTEGER NOT NULL REFERENCES dispatch_project(id) ON DELETE CASCADE,
    employee_id         INTEGER NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    stage               TEXT NOT NULL DEFAULT 'MATCHED',
    match_score         INTEGER,
    matched_skills      TEXT,
    proposed_at         TEXT,
    interview_at        TEXT,
    confirmed_at        TEXT,
    closed_at           TEXT,
    close_reason        TEXT,
    notes               TEXT,
    created_by          INTEGER REFERENCES auth_user(id),
    created_at          TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    UNIQUE(project_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_project_candidate_project ON project_candidate(project_id);
CREATE INDEX IF NOT EXISTS idx_project_candidate_employee ON project_candidate(employee_id);
CREATE INDEX IF NOT EXISTS idx_project_candidate_stage ON project_candidate(stage);

CREATE TABLE IF NOT EXISTS employee_project_assignment (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id         INTEGER NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    project_id          INTEGER NOT NULL REFERENCES dispatch_project(id) ON DELETE CASCADE,
    candidate_id        INTEGER REFERENCES project_candidate(id) ON DELETE SET NULL,
    client_name         TEXT NOT NULL,
    project_name        TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'PLANNED',
    start_date          TEXT NOT NULL,
    end_date            TEXT,
    is_primary          INTEGER NOT NULL DEFAULT 1,
    notes               TEXT,
    confirmed_by        INTEGER REFERENCES auth_user(id),
    confirmed_at        TEXT NOT NULL,
    created_at          TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_assignment_employee ON employee_project_assignment(employee_id);
CREATE INDEX IF NOT EXISTS idx_assignment_project ON employee_project_assignment(project_id);
CREATE INDEX IF NOT EXISTS idx_assignment_status ON employee_project_assignment(status);
CREATE INDEX IF NOT EXISTS idx_assignment_start ON employee_project_assignment(start_date);
CREATE INDEX IF NOT EXISTS idx_assignment_end ON employee_project_assignment(end_date);

CREATE TABLE IF NOT EXISTS employee_status_change_log (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id         INTEGER NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    old_work_status     TEXT,
    new_work_status     TEXT NOT NULL,
    old_end_date        TEXT,
    new_end_date        TEXT,
    trigger_type        TEXT NOT NULL,
    trigger_ref_id      INTEGER,
    reason              TEXT NOT NULL,
    applied_by          INTEGER REFERENCES auth_user(id),
    created_at          TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_status_log_employee ON employee_status_change_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_status_log_created ON employee_status_change_log(created_at);

CREATE TABLE IF NOT EXISTS employee_status_suggestion (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id         INTEGER NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    suggested_status    TEXT NOT NULL,
    suggested_end_date  TEXT,
    reason              TEXT NOT NULL,
    source_assignment_id INTEGER REFERENCES employee_project_assignment(id) ON DELETE SET NULL,
    status              TEXT NOT NULL DEFAULT 'PENDING',
    created_at          TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    resolved_at         TEXT,
    resolved_by         INTEGER REFERENCES auth_user(id)
);

CREATE INDEX IF NOT EXISTS idx_status_suggestion_pending ON employee_status_suggestion(status, employee_id);

CREATE TABLE IF NOT EXISTS assignment_cancel_followup (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id         INTEGER NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    assignment_id       INTEGER REFERENCES employee_project_assignment(id) ON DELETE SET NULL,
    project_id          INTEGER REFERENCES dispatch_project(id) ON DELETE SET NULL,
    cancel_reason       TEXT,
    status              TEXT NOT NULL DEFAULT 'OPEN',
    assigned_to         INTEGER REFERENCES auth_user(id),
    due_date            TEXT,
    notes               TEXT,
    created_by          INTEGER REFERENCES auth_user(id),
    created_at          TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    resolved_at         TEXT,
    resolved_by         INTEGER REFERENCES auth_user(id)
);

CREATE INDEX IF NOT EXISTS idx_cancel_followup_status ON assignment_cancel_followup(status, due_date);
CREATE INDEX IF NOT EXISTS idx_cancel_followup_assignee ON assignment_cancel_followup(assigned_to, status);
