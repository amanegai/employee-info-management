CREATE TABLE IF NOT EXISTS employee_personal (
    employee_id       INTEGER PRIMARY KEY REFERENCES employee(id) ON DELETE CASCADE,
    gender            TEXT,
    birth_date        TEXT,
    nationality       TEXT,
    phone             TEXT,
    email             TEXT,
    address           TEXT,
    education         TEXT,
    nearest_station   TEXT,
    photo_url         TEXT,
    furigana          TEXT,
    marital_status    TEXT,
    it_industry_years INTEGER,
    japan_arrival_date TEXT,
    education_degree  TEXT,
    school_name       TEXT,
    major             TEXT,
    japanese_level    TEXT,
    japanese_conversation TEXT,
    japanese_reading  TEXT,
    japanese_writing  TEXT,
    english_level     TEXT,
    english_conversation TEXT,
    english_reading   TEXT,
    english_writing   TEXT,
    technical_level   TEXT,
    specialty_dev     TEXT,
    specialty_business TEXT,
    self_pr           TEXT
);

CREATE TABLE IF NOT EXISTS employee_technical_skill (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id       INTEGER NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    category          TEXT NOT NULL,
    item_name         TEXT NOT NULL,
    level             TEXT NOT NULL,
    sort_order        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS employee_skill (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id       INTEGER NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    skill_name        TEXT NOT NULL,
    level             INTEGER NOT NULL DEFAULT 3,
    experience_years  INTEGER NOT NULL DEFAULT 0,
    sort_order        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS employee_qualification (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id       INTEGER NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    description       TEXT NOT NULL,
    sort_order        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS employee_career (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id       INTEGER NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    period            TEXT NOT NULL,
    organization      TEXT NOT NULL,
    role_overview     TEXT NOT NULL,
    sort_order        INTEGER NOT NULL DEFAULT 0,
    start_date        TEXT,
    end_date          TEXT,
    months            INTEGER,
    workplace         TEXT,
    role              TEXT,
    os_db             TEXT,
    languages         TEXT,
    fw_tools          TEXT,
    phases            TEXT
);

CREATE TABLE IF NOT EXISTS employee_attendance (
    employee_id           INTEGER PRIMARY KEY REFERENCES employee(id) ON DELETE CASCADE,
    attendance_rate       INTEGER NOT NULL DEFAULT 0,
    late_early_count      INTEGER NOT NULL DEFAULT 0,
    paid_leave_remaining  INTEGER NOT NULL DEFAULT 0,
    period_label          TEXT
);

CREATE TABLE IF NOT EXISTS employee_evaluation_history (
    employee_id              INTEGER PRIMARY KEY REFERENCES employee(id) ON DELETE CASCADE,
    year_label               TEXT NOT NULL,
    status_text              TEXT NOT NULL,
    next_evaluation_note     TEXT
);

CREATE TABLE IF NOT EXISTS employee_memo (
    employee_id       INTEGER PRIMARY KEY REFERENCES employee(id) ON DELETE CASCADE,
    content           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employee_evaluation_item (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id       INTEGER NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    category_code     TEXT NOT NULL,
    item_name         TEXT NOT NULL,
    rank_grade        TEXT NOT NULL,
    comment           TEXT NOT NULL,
    sort_order        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS employee_overall_evaluation (
    employee_id              INTEGER PRIMARY KEY REFERENCES employee(id) ON DELETE CASCADE,
    overall_rank             TEXT NOT NULL,
    rank_label               TEXT,
    continuation_text        TEXT,
    evaluation_date          TEXT,
    evaluator_name           TEXT,
    evaluator_department     TEXT,
    overall_comment          TEXT
);

CREATE TABLE IF NOT EXISTS employee_salary (
    employee_id           INTEGER PRIMARY KEY REFERENCES employee(id) ON DELETE CASCADE,
    basic_salary_monthly  INTEGER NOT NULL DEFAULT 0,
    commuter_allowance    INTEGER NOT NULL DEFAULT 0,
    annual_salary         INTEGER NOT NULL DEFAULT 0,
    bonus                 INTEGER NOT NULL DEFAULT 0,
    overtime_rate         INTEGER NOT NULL DEFAULT 0,
    payment_day           TEXT,
    billing_unit_price    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS employee_hr (
    employee_id                 INTEGER PRIMARY KEY REFERENCES employee(id) ON DELETE CASCADE,
    hire_date                   TEXT,
    contract_start_date         TEXT,
    contract_end_date           TEXT,
    social_insurance_status     TEXT,
    employment_insurance_no     TEXT,
    pension_no                  TEXT,
    emergency_contact_name      TEXT,
    emergency_contact_phone     TEXT,
    emergency_contact_relation  TEXT,
    paid_leave_start_date       TEXT
);

-- 既存DBへの列追加（continue-on-error でスキップ可）
ALTER TABLE employee_personal ADD COLUMN furigana TEXT;
ALTER TABLE employee_personal ADD COLUMN marital_status TEXT;
ALTER TABLE employee_personal ADD COLUMN it_industry_years INTEGER;
ALTER TABLE employee_personal ADD COLUMN japan_arrival_date TEXT;
ALTER TABLE employee_personal ADD COLUMN education_degree TEXT;
ALTER TABLE employee_personal ADD COLUMN school_name TEXT;
ALTER TABLE employee_personal ADD COLUMN major TEXT;
ALTER TABLE employee_personal ADD COLUMN japanese_level TEXT;
ALTER TABLE employee_personal ADD COLUMN japanese_conversation TEXT;
ALTER TABLE employee_personal ADD COLUMN japanese_reading TEXT;
ALTER TABLE employee_personal ADD COLUMN japanese_writing TEXT;
ALTER TABLE employee_personal ADD COLUMN english_level TEXT;
ALTER TABLE employee_personal ADD COLUMN english_conversation TEXT;
ALTER TABLE employee_personal ADD COLUMN english_reading TEXT;
ALTER TABLE employee_personal ADD COLUMN english_writing TEXT;
ALTER TABLE employee_personal ADD COLUMN technical_level TEXT;
ALTER TABLE employee_personal ADD COLUMN specialty_dev TEXT;
ALTER TABLE employee_personal ADD COLUMN specialty_business TEXT;
ALTER TABLE employee_personal ADD COLUMN self_pr TEXT;

ALTER TABLE employee_career ADD COLUMN start_date TEXT;
ALTER TABLE employee_career ADD COLUMN end_date TEXT;
ALTER TABLE employee_career ADD COLUMN months INTEGER;
ALTER TABLE employee_career ADD COLUMN workplace TEXT;
ALTER TABLE employee_career ADD COLUMN role TEXT;
ALTER TABLE employee_career ADD COLUMN os_db TEXT;
ALTER TABLE employee_career ADD COLUMN languages TEXT;
ALTER TABLE employee_career ADD COLUMN fw_tools TEXT;
ALTER TABLE employee_career ADD COLUMN phases TEXT;

ALTER TABLE employee_salary ADD COLUMN bonus INTEGER NOT NULL DEFAULT 0;
ALTER TABLE employee_salary ADD COLUMN overtime_rate INTEGER NOT NULL DEFAULT 0;
ALTER TABLE employee_salary ADD COLUMN payment_day TEXT;
ALTER TABLE employee_salary ADD COLUMN billing_unit_price INTEGER NOT NULL DEFAULT 0;

-- 起動のたびに重複を除去し、INSERT OR IGNORE が効くよう一意制約を付与
DELETE FROM employee_evaluation_item
WHERE id NOT IN (
    SELECT MIN(id) FROM employee_evaluation_item
    GROUP BY employee_id, category_code, item_name
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_eval_item_unique
ON employee_evaluation_item(employee_id, category_code, item_name);

DELETE FROM employee_skill
WHERE id NOT IN (
    SELECT MIN(id) FROM employee_skill
    GROUP BY employee_id, skill_name
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_unique
ON employee_skill(employee_id, skill_name);

DELETE FROM employee_qualification
WHERE id NOT IN (
    SELECT MIN(id) FROM employee_qualification
    GROUP BY employee_id, description
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_qualification_unique
ON employee_qualification(employee_id, description);

DELETE FROM employee_career
WHERE id NOT IN (
    SELECT MIN(id) FROM employee_career
    GROUP BY employee_id, period, organization
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_career_unique
ON employee_career(employee_id, period, organization);

DELETE FROM employee_technical_skill
WHERE id NOT IN (
    SELECT MIN(id) FROM employee_technical_skill
    GROUP BY employee_id, category, item_name
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_technical_skill_unique
ON employee_technical_skill(employee_id, category, item_name);
