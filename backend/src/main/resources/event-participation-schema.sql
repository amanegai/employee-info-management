CREATE TABLE IF NOT EXISTS client_event (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name     TEXT NOT NULL,
    event_name      TEXT NOT NULL,
    event_date      TEXT NOT NULL,
    event_time      TEXT,
    location        TEXT,
    event_type      TEXT NOT NULL DEFAULT 'その他',
    event_status    TEXT NOT NULL DEFAULT '予定',
    notes           TEXT,
    created_by      INTEGER REFERENCES auth_user(id),
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS client_event_participant (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id        INTEGER NOT NULL REFERENCES client_event(id) ON DELETE CASCADE,
    employee_id     INTEGER NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    note            TEXT,
    UNIQUE(event_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_client_event_date ON client_event(event_date);
CREATE INDEX IF NOT EXISTS idx_client_event_client ON client_event(client_name);
CREATE INDEX IF NOT EXISTS idx_client_event_participant_event ON client_event_participant(event_id);
CREATE INDEX IF NOT EXISTS idx_client_event_participant_employee ON client_event_participant(employee_id);
CREATE INDEX IF NOT EXISTS idx_client_event_status ON client_event(event_status);

CREATE TABLE IF NOT EXISTS client_event_reminder_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id        INTEGER NOT NULL REFERENCES client_event(id) ON DELETE CASCADE,
    employee_id     INTEGER NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    reminder_days   INTEGER NOT NULL,
    event_date      TEXT NOT NULL,
    sent_at         TEXT NOT NULL,
    UNIQUE(event_id, employee_id, reminder_days, event_date)
);

CREATE INDEX IF NOT EXISTS idx_client_event_reminder_event ON client_event_reminder_log(event_id);
