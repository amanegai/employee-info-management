CREATE TABLE IF NOT EXISTS department (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    parent_id   INTEGER REFERENCES department(id)
);

CREATE TABLE IF NOT EXISTS employee (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_code   TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    department_id   INTEGER REFERENCES department(id),
    position        TEXT NOT NULL DEFAULT '',
    employee_type   TEXT NOT NULL DEFAULT '',
    work_status     TEXT NOT NULL DEFAULT '',
    unit_price      INTEGER NOT NULL DEFAULT 0,
    evaluation      TEXT NOT NULL,
    end_date        TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_employee_department ON employee(department_id);
CREATE INDEX IF NOT EXISTS idx_employee_work_status ON employee(work_status);
CREATE INDEX IF NOT EXISTS idx_employee_end_date ON employee(end_date);
