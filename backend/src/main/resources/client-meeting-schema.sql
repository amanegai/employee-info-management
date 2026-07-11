CREATE TABLE IF NOT EXISTS client_meeting (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name             TEXT NOT NULL,
    client_contact_person   TEXT,
    title                   TEXT NOT NULL,
    meeting_date    TEXT NOT NULL,
    meeting_time    TEXT,
    location        TEXT,
    agenda          TEXT,
    minutes_body    TEXT,
    issues_summary  TEXT,
    created_by      INTEGER REFERENCES auth_user(id),
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS client_meeting_attendee (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_id      INTEGER NOT NULL REFERENCES client_meeting(id) ON DELETE CASCADE,
    employee_id     INTEGER NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    note            TEXT,
    UNIQUE(meeting_id, employee_id)
);

CREATE TABLE IF NOT EXISTS client_issue (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name             TEXT NOT NULL,
    meeting_id              INTEGER REFERENCES client_meeting(id) ON DELETE SET NULL,
    title                   TEXT NOT NULL,
    description             TEXT,
    status                  TEXT NOT NULL DEFAULT '未着手',
    priority                TEXT NOT NULL DEFAULT '中',
    due_date                TEXT,
    assignee_employee_id    INTEGER REFERENCES employee(id) ON DELETE SET NULL,
    created_by              INTEGER REFERENCES auth_user(id),
    created_at              TEXT NOT NULL,
    updated_at              TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_meeting_date ON client_meeting(meeting_date);
CREATE INDEX IF NOT EXISTS idx_client_meeting_client ON client_meeting(client_name);
CREATE INDEX IF NOT EXISTS idx_client_meeting_attendee_meeting ON client_meeting_attendee(meeting_id);
CREATE INDEX IF NOT EXISTS idx_client_meeting_attendee_employee ON client_meeting_attendee(employee_id);
CREATE INDEX IF NOT EXISTS idx_client_issue_client ON client_issue(client_name);
CREATE INDEX IF NOT EXISTS idx_client_issue_status ON client_issue(status);
CREATE INDEX IF NOT EXISTS idx_client_issue_due_date ON client_issue(due_date);
CREATE INDEX IF NOT EXISTS idx_client_issue_meeting ON client_issue(meeting_id);
CREATE INDEX IF NOT EXISTS idx_client_issue_assignee ON client_issue(assignee_employee_id);
